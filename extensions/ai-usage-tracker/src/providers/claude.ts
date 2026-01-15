import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ProviderUsage, UsageWindow } from "../types";

const KEYCHAIN_SERVICE = "Claude Code-credentials";
const CREDENTIALS_FILE = join(homedir(), ".claude", ".credentials.json");
const API_BASE = "https://api.anthropic.com";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const OAUTH_SCOPES = [
  "user:inference",
  "user:profile",
  "user:sessions:claude_code",
];

interface ClaudeOAuthData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | number;
  scopes?: string[];
  subscriptionType?: string;
  rateLimitTier?: string;
}

interface ClaudeKeychainData {
  claudeAiOauth?: ClaudeOAuthData;
}

interface OAuthUsageWindow {
  utilization?: number;
  resets_at?: string;
}

interface OAuthExtraUsage {
  is_enabled?: boolean;
  monthly_limit?: number;
  used_credits?: number;
  utilization?: number;
}

interface OAuthUsageResponse {
  five_hour?: OAuthUsageWindow;
  seven_day?: OAuthUsageWindow;
  seven_day_opus?: OAuthUsageWindow;
  seven_day_sonnet?: OAuthUsageWindow;
  extra_usage?: OAuthExtraUsage;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface CredentialsResult {
  token: string;
  refreshToken?: string;
  scopes?: string[];
  isExpired: boolean;
}

function parseExpiresAt(expiresAt: string | number | undefined): number {
  if (typeof expiresAt === "string") return new Date(expiresAt).getTime();
  if (typeof expiresAt === "number") return expiresAt;
  return 0;
}

function loadCredentials(): CredentialsResult | null {
  let data: ClaudeKeychainData | null = null;

  try {
    const result = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();
    if (result) {
      data = JSON.parse(result);
    }
  } catch {
    if (existsSync(CREDENTIALS_FILE)) {
      try {
        const content = readFileSync(CREDENTIALS_FILE, "utf-8");
        data = JSON.parse(content);
      } catch {
        return null;
      }
    }
  }

  if (!data?.claudeAiOauth?.accessToken) {
    return null;
  }

  const oauth = data.claudeAiOauth;
  const expiresAtMs = parseExpiresAt(oauth.expiresAt);
  const isExpired = Date.now() >= expiresAtMs;

  return {
    token: oauth.accessToken!,
    refreshToken: oauth.refreshToken,
    scopes: oauth.scopes,
    isExpired,
  };
}

async function refreshAccessToken(
  currentRefreshToken: string,
  scopes: string[],
): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: currentRefreshToken,
        client_id: CLIENT_ID,
        scope: scopes.join(" "),
      }),
    });

    if (!response.ok) {
      console.error(`Token refresh failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TokenRefreshResponse;

    const expiresAt = new Date(
      Date.now() + data.expires_in * 1000,
    ).toISOString();

    await updateKeychainTokens(
      data.access_token,
      data.refresh_token,
      expiresAt,
    );

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

async function updateKeychainTokens(
  accessToken: string,
  newRefreshToken: string,
  expiresAt: string,
): Promise<void> {
  try {
    const result = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();

    if (!result) return;

    const data = JSON.parse(result) as ClaudeKeychainData;
    if (!data.claudeAiOauth) return;

    data.claudeAiOauth.accessToken = accessToken;
    data.claudeAiOauth.refreshToken = newRefreshToken;
    data.claudeAiOauth.expiresAt = expiresAt;

    const jsonString = JSON.stringify(data).replace(/"/g, '\\"');
    execSync(
      `security delete-generic-password -s "${KEYCHAIN_SERVICE}" 2>/dev/null || true`,
      { encoding: "utf-8" },
    );
    execSync(
      `security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "Claude Code" -w "${jsonString}"`,
      { encoding: "utf-8" },
    );
  } catch {
    return;
  }
}

interface UsageFetchResult {
  data: OAuthUsageResponse | null;
  needsRefresh: boolean;
  error?: string;
}

async function fetchUsage(token: string): Promise<UsageFetchResult> {
  try {
    const response = await fetch(`${API_BASE}/api/oauth/usage`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "Raycast-AI-Usage-Tracker",
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { data: null, needsRefresh: true };
    }

    if (!response.ok) {
      return {
        data: null,
        needsRefresh: false,
        error: `API error: ${response.status}`,
      };
    }

    return { data: await response.json(), needsRefresh: false };
  } catch (error) {
    return { data: null, needsRefresh: false, error: String(error) };
  }
}

function parseUsageResponse(data: OAuthUsageResponse): UsageWindow[] {
  const windows: UsageWindow[] = [];

  if (data.five_hour?.utilization !== undefined) {
    const percentage = data.five_hour.utilization;
    windows.push({
      type: "session",
      label: "Session",
      used: Math.round(percentage),
      limit: 100,
      percentage,
      resetsAt: data.five_hour.resets_at
        ? new Date(data.five_hour.resets_at)
        : null,
    });
  }

  if (data.seven_day?.utilization !== undefined) {
    const percentage = data.seven_day.utilization;
    const resetsAt = data.seven_day.resets_at
      ? new Date(data.seven_day.resets_at)
      : null;

    let pace: UsageWindow["pace"];
    if (resetsAt) {
      const now = new Date();
      const totalDuration = 7 * 24 * 60 * 60 * 1000;
      const elapsed = totalDuration - (resetsAt.getTime() - now.getTime());
      const expectedPercentage = (elapsed / totalDuration) * 100;
      const diff = percentage - expectedPercentage;

      pace =
        diff > 5
          ? { status: "ahead", percentage: Math.abs(diff) }
          : diff < -5
            ? { status: "behind", percentage: Math.abs(diff) }
            : { status: "on-track", percentage: Math.abs(diff) };
    }

    windows.push({
      type: "weekly",
      label: "Weekly",
      used: Math.round(percentage),
      limit: 100,
      percentage,
      resetsAt,
      pace,
    });
  }

  if (data.seven_day_sonnet?.utilization !== undefined) {
    const percentage = data.seven_day_sonnet.utilization;
    windows.push({
      type: "model",
      label: "Sonnet",
      used: Math.round(percentage),
      limit: 100,
      percentage,
      resetsAt: data.seven_day_sonnet.resets_at
        ? new Date(data.seven_day_sonnet.resets_at)
        : null,
    });
  }

  if (data.seven_day_opus?.utilization !== undefined) {
    const percentage = data.seven_day_opus.utilization;
    windows.push({
      type: "model",
      label: "Opus",
      used: Math.round(percentage),
      limit: 100,
      percentage,
      resetsAt: data.seven_day_opus.resets_at
        ? new Date(data.seven_day_opus.resets_at)
        : null,
    });
  }

  return windows;
}

export async function fetchClaudeUsage(): Promise<ProviderUsage> {
  const baseUsage: ProviderUsage = {
    provider: "claude",
    name: "Claude",
    icon: "claude-icon.png",
    enabled: true,
    authenticated: false,
    lastUpdated: null,
    windows: [],
  };

  const credentials = loadCredentials();

  if (!credentials) {
    return {
      ...baseUsage,
      error: "No Claude credentials found. Run `claude` CLI to authenticate.",
    };
  }

  let accessToken = credentials.token;
  const scopes = credentials.scopes ?? OAUTH_SCOPES;
  const refreshToken = credentials.refreshToken;

  async function tryRefresh(): Promise<string | null> {
    if (!refreshToken) return null;
    const refreshed = await refreshAccessToken(refreshToken, scopes);
    return refreshed?.accessToken ?? null;
  }

  if (credentials.isExpired) {
    const newToken = await tryRefresh();
    if (newToken) {
      accessToken = newToken;
    } else {
      return {
        ...baseUsage,
        error: "Claude token expired. Run `claude` CLI to re-authenticate.",
      };
    }
  }

  let result = await fetchUsage(accessToken);

  if (result.needsRefresh) {
    const newToken = await tryRefresh();
    if (newToken) {
      accessToken = newToken;
      result = await fetchUsage(accessToken);
    }
  }

  if (!result.data) {
    const errorMsg = result.needsRefresh
      ? "Token revoked. Run `claude` CLI to re-authenticate."
      : (result.error ?? "Failed to fetch usage data.");
    return {
      ...baseUsage,
      authenticated: !result.needsRefresh,
      error: errorMsg,
    };
  }

  const windows = parseUsageResponse(result.data);

  return {
    ...baseUsage,
    authenticated: true,
    lastUpdated: new Date(),
    windows,
  };
}
