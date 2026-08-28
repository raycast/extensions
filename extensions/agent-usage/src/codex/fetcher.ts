import { parseDate } from "../agents/format.ts";
import { httpFetch } from "../agents/http.ts";
import type { CodexUsage, CodexError, CodexAdditionalRateLimit, CodexRateLimitWindow } from "./types.ts";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";
const CODEX_RESET_CREDITS_API = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";
const CODEX_USER_SETTINGS_API = "https://chatgpt.com/backend-api/wham/settings/user";
const CODEX_PROFILE_API = "https://chatgpt.com/backend-api/calpico/chatgpt/profile";

const CODEX_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const CODEX_PLAN_NAMES: Record<string, string> = {
  plus: "Plus",
  pro: "Pro 20x",
  prolite: "Pro 5x",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
  free: "Free",
  edu: "Edu",
};

interface CodexResetCreditsResult {
  resetCredits: CodexUsage["resetCredits"] | null;
  error: CodexError | null;
}

export async function fetchCodexUsage(
  token: string,
  accountId?: string | null,
): Promise<{ usage: CodexUsage | null; error: CodexError | null }> {
  const accountHeaders = getCodexAccountHeaders(accountId);
  const { data, error } = await httpFetch({
    url: CODEX_USAGE_API,
    token,
    headers: { ...CODEX_HEADERS, ...accountHeaders },
    unauthorizedMessage: "Authorization token expired or invalid. Run 'codex login' to refresh credentials.",
  });
  if (error) return { usage: null, error };

  const [{ resetCredits, error: resetCreditsError }, displayName] = await Promise.all([
    fetchCodexResetCredits(token, accountId),
    fetchCodexDisplayName(token, accountId),
  ]);
  return parseCodexApiResponse(
    data,
    resetCredits ?? { availableCount: null, expiresAtList: [] },
    resetCreditsError,
    displayName,
  );
}

export function parseCodexUserId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const userId = (data as { user_id?: unknown }).user_id;
  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

export function parseCodexDisplayName(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const displayName = (data as { display_name?: unknown }).display_name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}

export async function fetchCodexDisplayName(
  token: string,
  accountId?: string | null,
  request: typeof httpFetch = httpFetch,
): Promise<string | null> {
  const commonOptions = {
    token,
    headers: { ...CODEX_HEADERS, ...getCodexAccountHeaders(accountId) },
    timeoutMs: 2500,
    unauthorizedMessage: "Authorization token expired or invalid. Run 'codex login' to refresh credentials.",
  };
  const userResult = await request({ url: CODEX_USER_SETTINGS_API, ...commonOptions });
  if (userResult.error) return null;
  const userId = parseCodexUserId(userResult.data);
  if (!userId) return null;

  const profileResult = await request({
    url: `${CODEX_PROFILE_API}/${encodeURIComponent(userId)}`,
    ...commonOptions,
  });
  return profileResult.error ? null : parseCodexDisplayName(profileResult.data);
}

async function fetchCodexResetCredits(token: string, accountId?: string | null): Promise<CodexResetCreditsResult> {
  const { data, error } = await httpFetch({
    url: CODEX_RESET_CREDITS_API,
    token,
    headers: {
      ...CODEX_HEADERS,
      ...getCodexAccountHeaders(accountId),
      "OpenAI-Beta": "codex-1",
      originator: "Codex Desktop",
    },
    timeoutMs: 4000,
    unauthorizedMessage: "Authorization token expired or invalid. Run 'codex login' to refresh credentials.",
  });

  if (error) {
    return { resetCredits: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      resetCredits: null,
      error: { type: "parse_error", message: "Invalid reset-credit response format" },
    };
  }

  const response = data as {
    available_count?: number;
    credits?: Array<{
      status?: string;
      expires_at?: string | null;
    }>;
  };

  const availableCount = typeof response.available_count === "number" ? response.available_count : null;
  if (availableCount === null || availableCount < 0) {
    return {
      resetCredits: null,
      error: { type: "parse_error", message: "Invalid reset-credit response format" },
    };
  }

  const now = Date.now();
  const expiresAtList = (response.credits ?? [])
    .filter((credit) => credit.status === "available" && typeof credit.expires_at === "string")
    .map((credit) => credit.expires_at as string)
    .filter((expiresAt) => {
      const timestamp = Date.parse(expiresAt);
      return Number.isFinite(timestamp) && timestamp > now;
    })
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return { resetCredits: { availableCount, expiresAtList }, error: null };
}

function getCodexAccountHeaders(accountId?: string | null): Record<string, string> {
  const trimmedAccountId = accountId?.trim();
  return trimmedAccountId ? { "ChatGPT-Account-ID": trimmedAccountId } : {};
}

function formatCodexPlanName(planType?: string): string {
  const normalized = planType?.trim().toLowerCase();
  return normalized ? (CODEX_PLAN_NAMES[normalized] ?? planType?.trim() ?? "Unknown") : "Unknown";
}

function parseCodexApiResponse(
  data: unknown,
  resetCredits: CodexUsage["resetCredits"] | null = null,
  resetCreditsError: CodexError | null = null,
  displayName: string | null = null,
): { usage: CodexUsage | null; error: CodexError | null } {
  try {
    if (!data || typeof data !== "object") {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Invalid API response format",
        },
      };
    }

    const response = data as {
      plan_type?: string;
      rate_limit?: {
        primary_window?: CodexRateWindow | null;
        secondary_window?: CodexRateWindow | null;
      };
      code_review_rate_limit?: {
        primary_window?: CodexRateWindow | null;
      } | null;
      additional_rate_limits?: unknown;
      credits?: {
        has_credits?: boolean;
        unlimited?: boolean;
        balance?: string;
      };
    };

    const primaryWindow = response.rate_limit?.primary_window;
    const secondaryWindow = response.rate_limit?.secondary_window;

    if (!primaryWindow && !secondaryWindow) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing rate limit data in API response",
        },
      };
    }

    const fiveHourLimit = toLimit(pickWindow(primaryWindow, secondaryWindow, "fiveHour"));
    const weeklyLimit = toLimit(pickWindow(primaryWindow, secondaryWindow, "weekly"));

    const usage: CodexUsage = {
      account: formatCodexPlanName(response.plan_type),
      displayName: displayName ?? undefined,
      fiveHourLimit,
      weeklyLimit,
      additionalRateLimits: parseAdditionalRateLimits(response.additional_rate_limits),
      credits: {
        hasCredits: response.credits?.has_credits || false,
        unlimited: response.credits?.unlimited || false,
        balance: response.credits?.balance || "0",
      },
      resetCredits: resetCredits ?? undefined,
      resetCreditsError: resetCreditsError?.message,
    };

    const reviewWindow = response.code_review_rate_limit?.primary_window;
    if (reviewWindow) {
      usage.codeReviewLimit = toLimit(reviewWindow);
    }

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: error instanceof Error ? error.message : "Failed to parse API response",
      },
    };
  }
}

interface CodexRateWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds?: number;
  reset_at?: number;
}

function parseAdditionalRateLimits(value: unknown): CodexAdditionalRateLimit[] {
  if (!Array.isArray(value)) return [];

  const limits: CodexAdditionalRateLimit[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as {
      limit_name?: unknown;
      metered_feature?: unknown;
      rate_limit?: {
        primary_window?: unknown;
        secondary_window?: unknown;
      } | null;
    };
    const name = typeof entry.limit_name === "string" ? entry.limit_name.trim() : "";
    if (!name) continue;

    const windows = [entry.rate_limit?.primary_window, entry.rate_limit?.secondary_window]
      .map(parseRateWindow)
      .filter((window): window is CodexRateWindow => window !== null)
      .map((window) => toLimit(window))
      .filter((window): window is CodexRateLimitWindow => window !== undefined);
    if (windows.length === 0) continue;

    const meteredFeature =
      typeof entry.metered_feature === "string" && entry.metered_feature.trim()
        ? entry.metered_feature.trim()
        : undefined;
    limits.push({ name, meteredFeature, windows });
  }
  return limits;
}

function parseRateWindow(value: unknown): CodexRateWindow | null {
  if (!value || typeof value !== "object") return null;
  const window = value as Record<string, unknown>;
  if (
    typeof window.used_percent !== "number" ||
    !Number.isFinite(window.used_percent) ||
    typeof window.limit_window_seconds !== "number" ||
    !Number.isFinite(window.limit_window_seconds) ||
    window.limit_window_seconds <= 0
  ) {
    return null;
  }
  return {
    used_percent: window.used_percent,
    limit_window_seconds: window.limit_window_seconds,
    reset_after_seconds:
      typeof window.reset_after_seconds === "number" && Number.isFinite(window.reset_after_seconds)
        ? window.reset_after_seconds
        : undefined,
    reset_at: typeof window.reset_at === "number" && Number.isFinite(window.reset_at) ? window.reset_at : undefined,
  };
}

function toLimit(window: CodexRateWindow | null): CodexUsage["fiveHourLimit"] {
  if (!window) return undefined;
  return {
    percentageRemaining: 100 - window.used_percent,
    resetsInSeconds: getResetsInSeconds(window),
    limitWindowSeconds: window.limit_window_seconds,
  };
}

const SINGLE_WINDOW_FIVE_HOUR_THRESHOLD_SECONDS = 86400;

function pickWindow(
  primary: CodexRateWindow | null | undefined,
  secondary: CodexRateWindow | null | undefined,
  which: "fiveHour" | "weekly",
): CodexRateWindow | null {
  const a = primary ?? null;
  const b = secondary ?? null;
  if (a && b) {
    return which === "fiveHour"
      ? a.limit_window_seconds <= b.limit_window_seconds
        ? a
        : b
      : a.limit_window_seconds > b.limit_window_seconds
        ? a
        : b;
  }
  const only = a ?? b;
  if (!only) return null;
  const isFiveHour = only.limit_window_seconds <= SINGLE_WINDOW_FIVE_HOUR_THRESHOLD_SECONDS;
  return which === "fiveHour" ? (isFiveHour ? only : null) : isFiveHour ? null : only;
}

function getResetsInSeconds(window: { reset_after_seconds?: number; reset_at?: number }): number {
  if (typeof window.reset_after_seconds === "number") {
    return Math.max(0, Math.floor(window.reset_after_seconds));
  }

  if (typeof window.reset_at !== "number") {
    return 0;
  }

  const resetAt = parseDate(String(window.reset_at));
  return resetAt ? Math.max(0, Math.floor((resetAt.getTime() - Date.now()) / 1000)) : 0;
}

export { parseCodexApiResponse };
