import { useState, useEffect, useCallback, useRef } from "react";
import { CodexUsage, CodexError } from "./types";
import { listCodexOAuthAccounts, resolveCodexAuthTokens } from "./auth";
import { buildCodexAccountCandidates } from "./accounts";
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
        primary_window?: CodexRateWindow | null;
        secondary_window?: CodexRateWindow | null;
      };
      code_review_rate_limit?: {
        primary_window?: CodexRateWindow | null;
      } | null;
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
      fiveHourLimit,
      weeklyLimit,
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

export { formatDuration } from "../agents/format";

export { parseCodexApiResponse };

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
 * Returns one UsageState per discovered or manually configured Codex account.
 * File-backed Codex OAuth accounts are preferred so refreshed local tokens are used.
 *
 * Each entry in the returned array corresponds to one account.
 */
export function useCodexAccounts(enabled = true): AccountUsageState<CodexUsage, CodexError>[] {
  const [accountStates, setAccountStates] = useState<AccountUsageState<CodexUsage, CodexError>[]>([]);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const discoveredAccounts = listCodexOAuthAccounts();
    const manualAccounts = await loadAccounts("codex");
    const accounts = buildCodexAccountCandidates(discoveredAccounts, manualAccounts);

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
        if (account.needsAccountId) {
          return {
            account,
            result: {
              usage: null,
              error: {
                type: "not_configured" as const,
                message:
                  "Add the ChatGPT account ID for this manual Codex account, or run 'codex login' and let Agent Usage read the OAuth account from CODEX_HOME.",
              },
            },
          };
        }

        const result = await fetchCodexUsage(account.token, account.accountId);
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
        isOpenCodeActive: false,
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
