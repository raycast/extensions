import { useState, useEffect, useCallback, useRef } from "react";
import { CodexUsage, CodexError } from "./types";
import { resolveCodexAuthToken, resolveCodexAuthTokens } from "./auth";
import { httpFetch, normalizeBearerToken } from "../agents/http";
import { loadAccounts } from "../accounts/storage";
import type { AccountUsageState } from "../accounts/types";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";

const CODEX_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export async function fetchCodexUsage(token: string): Promise<{ usage: CodexUsage | null; error: CodexError | null }> {
  const { data, error } = await httpFetch({
    url: CODEX_USAGE_API,
    headers: { ...CODEX_HEADERS, Authorization: normalizeBearerToken(token) },
    unauthorizedMessage: "Authorization token expired or invalid. Run 'codex login' to refresh credentials.",
  });
  if (error) return { usage: null, error };
  return parseCodexApiResponse(data);
}

function parseCodexApiResponse(data: unknown): { usage: CodexUsage | null; error: CodexError | null } {
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
          reset_after_seconds: number;
        };
        secondary_window?: {
          used_percent: number;
          limit_window_seconds: number;
          reset_after_seconds: number;
        };
      };
      code_review_rate_limit?: {
        primary_window?: {
          used_percent: number;
          limit_window_seconds: number;
          reset_after_seconds: number;
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
        resetsInSeconds: primaryWindow.reset_after_seconds,
        limitWindowSeconds: primaryWindow.limit_window_seconds,
      },
      weeklyLimit: {
        percentageRemaining: 100 - secondaryWindow.used_percent,
        resetsInSeconds: secondaryWindow.reset_after_seconds,
        limitWindowSeconds: secondaryWindow.limit_window_seconds,
      },
      credits: {
        hasCredits: response.credits?.has_credits || false,
        unlimited: response.credits?.unlimited || false,
        balance: response.credits?.balance || "0",
      },
    };

    if (response.code_review_rate_limit?.primary_window) {
      const reviewWindow = response.code_review_rate_limit.primary_window;
      usage.codeReviewLimit = {
        percentageRemaining: 100 - reviewWindow.used_percent,
        resetsInSeconds: reviewWindow.reset_after_seconds,
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

    const token = resolveCodexAuthToken();

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

    const result = await fetchCodexUsage(token);
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
    const { localToken } = resolveCodexAuthTokens();

    // Build list of all accounts: manual + auto-detected (if not duplicate)
    const accounts = [...manualAccounts];

    // Add auto-detected token as separate account if not already present
    if (localToken && !accounts.some((a) => a.token === localToken)) {
      accounts.push({
        id: "codex-auto",
        label: "Auto-detected",
        token: localToken,
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
        const result = await fetchCodexUsage(account.token);
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
