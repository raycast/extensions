import { useState, useEffect, useCallback, useRef } from "react";
import { CodexUsage, CodexError } from "./types";
import { resolveCodexAuthTokens } from "./auth";
import { httpFetch } from "../agents/http";
import { parseDate } from "../agents/format";
import { loadAccounts } from "../accounts/storage";
import type { AccountUsageState } from "../accounts/types";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";
const CODEX_RESET_CREDITS_API = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";

const CODEX_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
  return parseCodexApiResponse(data, resetCredits ?? { availableCount: null, nextExpiresAt: null }, resetCreditsError);
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
  const nextExpiresAt = (response.credits ?? [])
    .filter((credit) => credit.status === "available" && typeof credit.expires_at === "string")
    .map((credit) => credit.expires_at as string)
    .filter((expiresAt) => {
      const timestamp = Date.parse(expiresAt);
      return Number.isFinite(timestamp) && timestamp > now;
    })
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];

  return { resetCredits: { availableCount, nextExpiresAt: nextExpiresAt ?? null }, error: null };
}

function getCodexAccountHeaders(accountId?: string | null): Record<string, string> {
  const trimmedAccountId = accountId?.trim();
  return trimmedAccountId ? { "ChatGPT-Account-ID": trimmedAccountId } : {};
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
      account: response.plan_type || "Unknown",
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
  const [usage, setUsage] = useState<CodexUsage | null>(null);
  const [error, setError] = useState<CodexError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

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

    const result = await fetchCodexUsage(token, primaryAccountId);
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
      fetchData();
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

/**
 * Returns one UsageState per named Codex account stored in LocalStorage.
 * Falls back to the auto-detected token from ~/.codex/auth.json if no accounts are stored.
 *
 * Each entry in the returned array corresponds to one account.
 * The array is stable in order (matches LocalStorage order).
 */
export function useCodexAccounts(enabled = true): AccountUsageState<CodexUsage, CodexError>[] {
  const [accountStates, setAccountStates] = useState<AccountUsageState<CodexUsage, CodexError>[]>([]);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const manualAccounts = await loadAccounts("codex");

    // Get auto-detected token from codex auth file
    const { localToken, localAccountId } = resolveCodexAuthTokens();

    // Build list of all accounts: manual + auto-detected (if not duplicate)
    const accounts = [...manualAccounts];

    // Add auto-detected token as separate account if not already present
    if (localToken && !accounts.some((a) => a.token === localToken)) {
      accounts.push({
        id: "codex-auto",
        label: "Auto-detected",
        token: localToken,
        ...(localAccountId ? { accountId: localAccountId } : {}),
      });
    }

    // Fallback: if no accounts at all, show not configured
    if (accounts.length === 0) {
      setAccountStates([
        {
          accountId: "none",
          label: "Default",
          token: "",
          isLoading: false,
          usage: null,
          error: {
            type: "not_configured",
            message:
              "Codex is not configured. Run 'codex login' to authenticate or add an account via Manage Accounts.",
          },
          revalidate: async () => {
            await fetchAll();
          },
        },
      ]);
      return;
    }

    // Kick off all fetches in parallel
    const results = await Promise.all(
      accounts.map(async (account) => {
        const accountId = account.accountId ?? (account.token === localToken ? localAccountId : null);
        if (!accountId && account.token !== localToken) {
          return {
            account,
            result: {
              usage: null,
              error: {
                type: "not_configured" as const,
                message:
                  "Add the ChatGPT account ID for this Codex account to avoid showing the token's default account.",
              },
            },
          };
        }
        const result = await fetchCodexUsage(account.token, accountId);
        return { account, result };
      }),
    );

    if (requestId !== requestIdRef.current) return;

    setAccountStates(
      results.map(({ account, result }) => ({
        accountId: account.id,
        label: account.label,
        token: account.token,
        isLoading: false,
        usage: result.usage,
        error: result.error,
        isOpenCodeActive: false, // Codex uses different auth source
        revalidate: async () => {
          await fetchAll();
        },
      })),
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setAccountStates([]);
      return;
    }
    void fetchAll();
  }, [enabled, fetchAll]);

  // Set initial loading state only if no data exists
  useEffect(() => {
    if (!enabled) return;
    setAccountStates((prev) =>
      prev.length === 0 || prev.some((s) => s.accountId === "none")
        ? [
            {
              accountId: "loading",
              label: "Loading…",
              token: "",
              isLoading: true,
              usage: null,
              error: null,
              revalidate: async () => {
                await fetchAll();
              },
            },
          ]
        : prev,
    );
  }, [enabled, fetchAll]);

  return accountStates;
}
