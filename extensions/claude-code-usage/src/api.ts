import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const USAGE_ENDPOINT = "https://api.anthropic.com/api/oauth/usage";
const BETA_HEADER = "oauth-2025-04-20";
const CACHE_KEY = "claude-usage-cache";
const CACHE_TTL_MS = 120_000; // 2 minutes

interface UsageBucket {
  utilization: number;
  resets_at: string | null;
}

export interface UsageResponse {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  seven_day_oauth_apps: UsageBucket | null;
  seven_day_opus: UsageBucket | null;
}

interface CachedData {
  data: UsageResponse;
  timestamp: number;
}

interface CredentialsFile {
  claudeAiOauth: OAuthData;
}

interface OAuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
  rateLimitTier?: string;
}

export interface CredentialInfo {
  accessToken: string;
  subscriptionType: string;
  rateLimitTier?: string;
  expiresAt: number;
}

function parseOAuthData(data: OAuthData): CredentialInfo {
  if (!data.accessToken) {
    throw new Error("No OAuth access token found in credentials.");
  }

  if (data.expiresAt && Date.now() > data.expiresAt) {
    throw new Error(
      "OAuth token has expired. Run 'claude auth login' to re-authenticate.",
    );
  }

  return {
    accessToken: data.accessToken,
    subscriptionType: data.subscriptionType,
    rateLimitTier: data.rateLimitTier,
    expiresAt: data.expiresAt,
  };
}

async function getCredentialsFromFile(): Promise<CredentialInfo> {
  const credPath = join(homedir(), ".claude", ".credentials.json");

  try {
    const raw = await readFile(credPath, "utf-8");
    const creds: CredentialsFile = JSON.parse(raw.trim());
    return parseOAuthData(creds.claudeAiOauth);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Credentials file not found at ${credPath}. ` +
          "Make sure Claude Code is installed and you've logged in with 'claude auth login'.",
      );
    }
    throw err;
  }
}

export async function getCredentials(): Promise<CredentialInfo> {
  return await getCredentialsFromFile();
}

async function getCachedUsage(): Promise<UsageResponse | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;

  try {
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  } catch {
    // corrupted cache
  }
  return null;
}

async function setCachedUsage(data: UsageResponse): Promise<void> {
  const cached: CachedData = { data, timestamp: Date.now() };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cached));
}

async function fetchWithRetry(
  token: string,
  retries = 3,
): Promise<UsageResponse> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(USAGE_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "claude-code/2.1.69",
        Authorization: `Bearer ${token}`,
        "anthropic-beta": BETA_HEADER,
        "Accept-Encoding": "gzip, compress, deflate, br",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      return {
        five_hour: (data.five_hour as UsageBucket) || null,
        seven_day: (data.seven_day as UsageBucket) || null,
        seven_day_oauth_apps:
          (data.seven_day_oauth_apps as UsageBucket) || null,
        seven_day_opus: (data.seven_day_opus as UsageBucket) || null,
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs =
        retryAfter && Number(retryAfter) > 0
          ? Number(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt), 8000);

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      const cached = await getCachedUsage();
      if (cached) return cached;

      throw new Error(
        "Rate limited (HTTP 429). The usage endpoint is throttled by Anthropic. " +
          "This is a known issue (github.com/anthropics/claude-code/issues/30930). " +
          "Data will refresh automatically when available.",
      );
    }

    const body = await response.text();
    throw new Error(`API request failed (HTTP ${response.status}): ${body}`);
  }

  throw new Error("Unexpected: exhausted retries");
}

export async function fetchUsageStats(): Promise<UsageResponse> {
  const cached = await getCachedUsage();
  if (cached) return cached;

  const creds = await getCredentials();
  const data = await fetchWithRetry(creds.accessToken);
  await setCachedUsage(data);
  return data;
}
