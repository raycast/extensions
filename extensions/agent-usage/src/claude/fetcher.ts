import { useState, useEffect, useCallback, useRef } from "react";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type { ClaudeUsage, ClaudeError } from "./types";

const CLAUDE_CREDENTIALS_PATH = path.join(os.homedir(), ".claude", ".credentials.json");
const CLAUDE_USAGE_API = "https://api.anthropic.com/api/oauth/usage";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const REQUEST_TIMEOUT = 10000;

type CredentialSource = "file" | "keychain";

interface ClaudeCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
  rateLimitTier?: string;
  subscriptionType?: string;
  source: CredentialSource;
  keychainAccount?: string;
  raw: {
    claudeAiOauth?: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      scopes?: string[];
      rateLimitTier?: string;
      rate_limit_tier?: string;
      subscriptionType?: string;
      subscription_type?: string;
    };
  };
}

interface OAuthWindow {
  utilization?: number;
  resets_at?: string;
}

interface OAuthExtraUsage {
  is_enabled?: boolean;
  monthly_limit?: number;
  used_credits?: number;
  currency?: string;
}

interface OAuthUsageResponse {
  five_hour?: OAuthWindow;
  seven_day?: OAuthWindow;
  seven_day_sonnet?: OAuthWindow;
  seven_day_opus?: OAuthWindow;
  extra_usage?: OAuthExtraUsage;
}

interface OAuthRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

const CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CLAUDE_OAUTH_REFRESH_API = "https://platform.claude.com/v1/oauth/token";

function normalizeAccessToken(token: string): string {
  const trimmed = token.trim();
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function inferPlan(rateLimitTier?: string, subscriptionType?: string): string {
  const tier = (rateLimitTier || "").toLowerCase();
  const subscription = (subscriptionType || "").toLowerCase();

  if (subscription.includes("max")) return "Claude Max";
  if (subscription.includes("pro")) return "Claude Pro";
  if (subscription.includes("team")) return "Claude Team";
  if (subscription.includes("enterprise")) return "Claude Enterprise";

  if (tier.includes("max")) return "Claude Max";
  if (tier.includes("pro")) return "Claude Pro";
  if (tier.includes("team")) return "Claude Team";
  if (tier.includes("enterprise")) return "Claude Enterprise";
  return "Claude";
}

function formatResetsIn(isoTime?: string): string | null {
  if (!isoTime) return null;

  const resetDate = new Date(isoTime);
  if (Number.isNaN(resetDate.getTime())) return null;

  const diffMs = resetDate.getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

interface CredentialsParsed {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
    rateLimitTier?: string;
    rate_limit_tier?: string;
    subscriptionType?: string;
    subscription_type?: string;
  };
}

function tryDecodeHexJson(text: string): CredentialsParsed | null {
  let hex = text.trim();
  if (hex.startsWith("0x") || hex.startsWith("0X")) hex = hex.slice(2);
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return JSON.parse(decoded) as CredentialsParsed;
  } catch {
    return null;
  }
}

function tryParseCredentialJSON(text: string): CredentialsParsed | null {
  try {
    return JSON.parse(text) as CredentialsParsed;
  } catch {
    return tryDecodeHexJson(text);
  }
}

function readKeychainPassword(service: string): string | null {
  try {
    const result = execSync(`security find-generic-password -s ${JSON.stringify(service)} -w`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

function readKeychainAccount(service: string): string | null {
  try {
    const result = execSync(`security find-generic-password -s ${JSON.stringify(service)} -g 2>&1`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = result.match(/"acct"<blob>="([^"\n]*)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function writeKeychainPassword(service: string, account: string, value: string): void {
  try {
    execSync(
      `security add-generic-password -U -a ${JSON.stringify(account)} -s ${JSON.stringify(service)} -w ${JSON.stringify(value)}`,
      {
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch {
    // Best effort
  }
}

function extractCredentials(
  parsed: CredentialsParsed,
  source: CredentialSource,
  keychainAccount?: string,
): { credentials: ClaudeCredentials | null; error: ClaudeError | null } {
  const oauth = parsed.claudeAiOauth;
  const accessToken = normalizeAccessToken(oauth?.accessToken || "");
  const refreshToken = oauth?.refreshToken?.trim() || "";
  const expiresAt = typeof oauth?.expiresAt === "number" ? oauth.expiresAt : undefined;

  if (!accessToken) {
    return {
      credentials: null,
      error: {
        type: "not_configured",
        message: "Claude OAuth token missing. Run 'claude' to authenticate.",
      },
    };
  }

  const scopes = Array.isArray(oauth?.scopes) ? oauth.scopes : [];
  const rateLimitTier = pickString(oauth?.rateLimitTier, oauth?.rate_limit_tier);
  const subscriptionType = pickString(oauth?.subscriptionType, oauth?.subscription_type);
  if (!scopes.includes("user:profile")) {
    return {
      credentials: null,
      error: {
        type: "missing_scope",
        message: "Claude OAuth token missing 'user:profile' scope. Run 'claude setup-token'.",
      },
    };
  }

  return {
    credentials: {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      scopes,
      rateLimitTier,
      subscriptionType,
      source,
      keychainAccount,
      raw: parsed,
    },
    error: null,
  };
}

function readClaudeCredentials(): { credentials: ClaudeCredentials | null; error: ClaudeError | null } {
  // Strategy 1: Try credentials file first
  if (fs.existsSync(CLAUDE_CREDENTIALS_PATH)) {
    try {
      const text = fs.readFileSync(CLAUDE_CREDENTIALS_PATH, "utf-8");
      const parsed = tryParseCredentialJSON(text);
      if (parsed?.claudeAiOauth?.accessToken) {
        return extractCredentials(parsed, "file");
      }
    } catch {
      // Fall through to keychain
    }
  }

  // Strategy 2: Keychain fallback (macOS)
  if (process.platform === "darwin") {
    const keychainValue = readKeychainPassword(KEYCHAIN_SERVICE);
    if (keychainValue) {
      const parsed = tryParseCredentialJSON(keychainValue);
      if (parsed?.claudeAiOauth?.accessToken) {
        return extractCredentials(parsed, "keychain", readKeychainAccount(KEYCHAIN_SERVICE) ?? undefined);
      }
    }
  }

  return {
    credentials: null,
    error: {
      type: "not_configured",
      message: "Claude CLI not configured. Run 'claude' to authenticate.",
    },
  };
}

function persistRefreshedCredentials(credentials: ClaudeCredentials, refreshed: OAuthRefreshResponse) {
  const raw = credentials.raw || {};
  const oauth = raw.claudeAiOauth || {};

  const next = {
    ...raw,
    claudeAiOauth: {
      ...oauth,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || oauth.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    },
  };

  if (credentials.source === "keychain") {
    if (credentials.keychainAccount === undefined) {
      return;
    }

    // Minified JSON — macOS `security -w` hex-encodes values with newlines,
    // which Claude Code can't read back, causing it to invalidate the session.
    writeKeychainPassword(KEYCHAIN_SERVICE, credentials.keychainAccount, JSON.stringify(next));
  } else {
    try {
      fs.writeFileSync(CLAUDE_CREDENTIALS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    } catch {
      // Best effort; continue with refreshed token in memory
    }
  }
}

async function refreshClaudeAccessToken(credentials: ClaudeCredentials): Promise<OAuthRefreshResponse | null> {
  if (!credentials.refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
    client_id: CLAUDE_OAUTH_CLIENT_ID,
  });

  const response = await fetch(CLAUDE_OAUTH_REFRESH_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OAuthRefreshResponse;
  if (!data.access_token || typeof data.expires_in !== "number") {
    return null;
  }
  return data;
}

async function fetchClaudeUsage(
  credentials: ClaudeCredentials,
): Promise<{ usage: ClaudeUsage | null; error: ClaudeError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let accessToken = credentials.accessToken;
    const isLikelyExpired = typeof credentials.expiresAt === "number" && Date.now() >= credentials.expiresAt - 60000;
    if (isLikelyExpired) {
      const refreshed = await refreshClaudeAccessToken(credentials);
      if (refreshed) {
        accessToken = refreshed.access_token;
        persistRefreshedCredentials(credentials, refreshed);
      }
    }

    let response = await fetch(CLAUDE_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });

    if (response.status === 401 && credentials.refreshToken) {
      const refreshed = await refreshClaudeAccessToken(credentials);
      if (refreshed) {
        accessToken = refreshed.access_token;
        persistRefreshedCredentials(credentials, refreshed);
        response = await fetch(CLAUDE_USAGE_API, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "anthropic-beta": "oauth-2025-04-20",
          },
          signal: controller.signal,
        });
      }
    }

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Claude token expired or invalid. Run 'claude' to re-authenticate.",
        },
      };
    }

    if (response.status === 403) {
      const body = await response.text();
      if (body.includes("user:profile")) {
        return {
          usage: null,
          error: {
            type: "missing_scope",
            message: "Claude OAuth token does not include 'user:profile'. Run 'claude setup-token'.",
          },
        };
      }
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Claude usage endpoint rejected the token. Run 'claude' to refresh login.",
        },
      };
    }

    if (!response.ok) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const data = (await response.json()) as OAuthUsageResponse;
    const fiveHour = data.five_hour;

    if (!fiveHour || typeof fiveHour.utilization !== "number") {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing five_hour usage in Claude response.",
        },
      };
    }

    const sevenDay = data.seven_day;
    const sevenDayModel = data.seven_day_sonnet ?? data.seven_day_opus;

    const extra = data.extra_usage;
    const extraUsage =
      extra?.is_enabled && typeof extra.monthly_limit === "number" && typeof extra.used_credits === "number"
        ? {
            used: extra.used_credits / 100,
            limit: extra.monthly_limit / 100,
            currency: (extra.currency || "USD").toUpperCase(),
          }
        : null;

    const usage: ClaudeUsage = {
      plan: inferPlan(credentials.rateLimitTier, credentials.subscriptionType),
      fiveHour: {
        percentageRemaining: clampPercent(100 - fiveHour.utilization),
        resetsIn: formatResetsIn(fiveHour.resets_at),
      },
      sevenDay:
        sevenDay && typeof sevenDay.utilization === "number"
          ? {
              percentageRemaining: clampPercent(100 - sevenDay.utilization),
              resetsIn: formatResetsIn(sevenDay.resets_at),
            }
          : null,
      sevenDayModel:
        sevenDayModel && typeof sevenDayModel.utilization === "number"
          ? {
              percentageRemaining: clampPercent(100 - sevenDayModel.utilization),
              resetsIn: formatResetsIn(sevenDayModel.resets_at),
            }
          : null,
      extraUsage,
    };

    return { usage, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: {
          type: "network_error",
          message: "Request timeout. Please check your network connection.",
        },
      };
    }

    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

export function useClaudeUsage(enabled = true) {
  const [usage, setUsage] = useState<ClaudeUsage | null>(null);
  const [error, setError] = useState<ClaudeError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const { credentials, error: credentialsError } = readClaudeCredentials();
    if (!credentials) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setUsage(null);
      setError(credentialsError);
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    const result = await fetchClaudeUsage(credentials);
    if (requestId !== requestIdRef.current) {
      return;
    }
    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setUsage(null);
      setError(null);
      setIsLoading(false);
      setHasInitialFetch(false);
      return;
    }

    if (!hasInitialFetch) {
      void fetchData();
    }
  }, [enabled, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    if (!enabled) {
      return;
    }

    await fetchData();
  }, [enabled, fetchData]);

  return {
    isLoading: enabled ? isLoading : false,
    usage: enabled ? usage : null,
    error: enabled ? error : null,
    revalidate,
  };
}
