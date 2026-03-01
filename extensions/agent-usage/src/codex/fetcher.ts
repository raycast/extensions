import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { CodexUsage, CodexError } from "./types";
import { resolveCodexAuthTokens, shouldFallbackToPreferenceToken } from "./auth";
import { httpFetch, normalizeBearerToken } from "../agents/http";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";

type Preferences = Preferences.AgentUsage;

const CODEX_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchCodexUsage(token: string): Promise<{ usage: CodexUsage | null; error: CodexError | null }> {
  const { data, error } = await httpFetch({
    url: CODEX_USAGE_API,
    headers: { ...CODEX_HEADERS, Authorization: normalizeBearerToken(token) },
    unauthorizedMessage:
      "Authorization token expired or invalid. Run 'codex login' or update the token in extension settings.",
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

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export { formatDuration };

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

    const preferences = getPreferenceValues<Preferences>();
    const preferenceToken = preferences.codexAuthToken?.trim() || "";
    const {
      primaryToken,
      localToken,
      preferenceToken: cleanedPreferenceToken,
    } = resolveCodexAuthTokens({ preferenceToken });

    if (!primaryToken) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "Codex is not configured. Run 'codex login' or add a token in extension settings (Cmd+,).",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    let result = await fetchCodexUsage(primaryToken);
    if (requestId !== requestIdRef.current) {
      return;
    }

    if (
      cleanedPreferenceToken &&
      shouldFallbackToPreferenceToken({
        localToken,
        preferenceToken: cleanedPreferenceToken,
        errorType: result.error?.type,
      })
    ) {
      result = await fetchCodexUsage(cleanedPreferenceToken);
      if (requestId !== requestIdRef.current) {
        return;
      }
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
