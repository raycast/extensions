import { useState, useEffect, useCallback, useRef } from "react";
import { CodexUsage, CodexError } from "./types";
import { createAccountsHook } from "../agents/hooks";
import { listCodexOAuthAccounts, resolveCodexAuthTokens } from "./auth";
import { buildCodexAccountCandidates } from "./accounts";
import { httpFetch } from "../agents/http";
import { parseDate } from "../agents/format";
import { loadAccounts } from "../accounts/storage";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";
const CODEX_RESET_CREDITS_API = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";

const CODEX_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const CODEX_PLAN_NAMES: Record<string, string> = {
  pro: "Pro 20x",
  prolite: "Pro 5x",
  team: "Team",
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

  const { resetCredits, error: resetCreditsError } = await fetchCodexResetCredits(token, accountId);
  return parseCodexApiResponse(data, resetCredits ?? { availableCount: null, expiresAtList: [] }, resetCreditsError);
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
        primary_window?: {
          used_percent: number;
          limit_window_seconds: number;
          reset_after_seconds?: number;
          reset_at?: number;
        };
        secondary_window?: {
          used_percent: number;
          limit_window_seconds: number;
          reset_after_seconds?: number;
          reset_at?: number;
        };
      };
      code_review_rate_limit?: {
        primary_window?: {
          used_percent: number;
          limit_window_seconds: number;
          reset_after_seconds?: number;
          reset_at?: number;
        };
      };
      credits?: {
        has_credits: boolean;
        unlimited: boolean;
        balance: string;
      };
    };

    const primaryWindow = response.rate_limit?.primary_window;
    const secondaryWindow = response.rate_limit?.secondary_window;

    if (!primaryWindow || !secondaryWindow) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing rate limit data in API response",
        },
      };
    }

    const usage: CodexUsage = {
      account: formatCodexPlanName(response.plan_type),
      fiveHourLimit: {
        percentageRemaining: 100 - primaryWindow.used_percent,
        resetsInSeconds: getResetsInSeconds(primaryWindow),
        limitWindowSeconds: primaryWindow.limit_window_seconds,
      },
      weeklyLimit: {
        percentageRemaining: 100 - secondaryWindow.used_percent,
        resetsInSeconds: getResetsInSeconds(secondaryWindow),
        limitWindowSeconds: secondaryWindow.limit_window_seconds,
      },
      credits: {
        hasCredits: response.credits?.has_credits || false,
        unlimited: response.credits?.unlimited || false,
        balance: response.credits?.balance || "0",
      },
      resetCredits: resetCredits ?? undefined,
      resetCreditsError: resetCreditsError?.message,
    };

    if (response.code_review_rate_limit?.primary_window) {
      const reviewWindow = response.code_review_rate_limit.primary_window;
      usage.codeReviewLimit = {
        percentageRemaining: 100 - reviewWindow.used_percent,
        resetsInSeconds: getResetsInSeconds(reviewWindow),
        limitWindowSeconds: reviewWindow.limit_window_seconds,
      };
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

export { formatDuration } from "../agents/format";

export function useCodexUsage(enabled = true) {
  const getCachedState = () => {
    try {
      const { primaryToken: token, primaryAccountId } = resolveCodexAuthTokens();
      if (!token) return null;

      const cacheKey = `codex-${token}-${primaryAccountId || "default"}`;
      return getSharedCacheEntry(cacheKey);
    } catch {
      // Safe fallback
    }
    return null;
  };

  const cached = getCachedState();
  const [usage, setUsage] = useState<CodexUsage | null>(cached ? (cached.usage as CodexUsage) : null);
  const [error, setError] = useState<CodexError | null>(cached ? (cached.error as CodexError) : null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !cached);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(!!cached);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | undefined>(cached ? cached.timestamp : undefined);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    const requestId = ++requestIdRef.current;

    const { primaryToken: token, primaryAccountId } = resolveCodexAuthTokens();

    if (!token) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "Codex is not configured. Run 'codex login' to authenticate.",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    const cacheKey = `codex-${token}-${primaryAccountId || "default"}`;
    const cachedEntry = getSharedCacheEntry(cacheKey);

    if (!force && cachedEntry) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setUsage(cachedEntry.usage as CodexUsage);
      setError(cachedEntry.error as CodexError);
      setIsLoading(false);
      setHasInitialFetch(true);
      setLastFetchedAt(cachedEntry.timestamp);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchCodexUsage(token, primaryAccountId);
    if (requestId !== requestIdRef.current) {
      return;
    }

    const fetchTime = Date.now();
    setSharedCacheEntry(cacheKey, result.usage, result.error, fetchTime);

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
    setLastFetchedAt(fetchTime);
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
      fetchData(false);
    }
  }, [enabled, hasInitialFetch, fetchData]);

  const revalidate = useCallback(
    async (force = true) => {
      if (!enabled) {
        return;
      }

      await fetchData(force);
    },
    [enabled, fetchData],
  );

  return {
    isLoading: enabled ? isLoading : false,
    usage: enabled ? usage : null,
    error: enabled ? error : null,
    revalidate,
    lastFetchedAt,
  };
}

export const useCodexAccounts = createAccountsHook<
  CodexUsage,
  CodexError,
  { id: string; label: string; token: string; accountId?: string; needsAccountId?: boolean }
>({
  agentName: "codex",
  getAccounts: async () => {
    const discoveredAccounts = listCodexOAuthAccounts();
    const manualAccounts = await loadAccounts("codex");
    return buildCodexAccountCandidates(discoveredAccounts, manualAccounts);
  },
  fetcher: async (acc) => {
    if (acc.needsAccountId) {
      return {
        usage: null,
        error: {
          type: "not_configured" as const,
          message:
            "Add the ChatGPT account ID for this manual Codex account, or run 'codex login' and let Agent Usage read the OAuth account from CODEX_HOME.",
        },
      };
    }
    return fetchCodexUsage(acc.token, acc.accountId);
  },
  noAccountsError: {
    type: "not_configured",
    message: "Codex is not configured. Run 'codex login' to authenticate or add an account via Manage Accounts.",
  },
});
