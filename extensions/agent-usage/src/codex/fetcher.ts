import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { CodexUsage, CodexError } from "./types";
import { normalizeCodexAuthorizationHeader, resolveCodexAuthTokens, shouldFallbackToPreferenceToken } from "./auth";

const CODEX_USAGE_API = "https://chatgpt.com/backend-api/wham/usage";
const REQUEST_TIMEOUT = 10000;

type Preferences = Preferences.AgentUsage;

async function fetchCodexUsage(token: string): Promise<{ usage: CodexUsage | null; error: CodexError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(CODEX_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: normalizeCodexAuthorizationHeader(token),
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message:
            "Authorization token expired or invalid. Run 'codex login' or update the token in extension settings.",
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

    const data = await response.json();

    return parseCodexApiResponse(data);
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

export function useCodexUsage() {
  const [usage, setUsage] = useState<CodexUsage | null>(null);
  const [error, setError] = useState<CodexError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
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

    if (
      cleanedPreferenceToken &&
      shouldFallbackToPreferenceToken({
        localToken,
        preferenceToken: cleanedPreferenceToken,
        errorType: result.error?.type,
      })
    ) {
      result = await fetchCodexUsage(cleanedPreferenceToken);
    }

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, []);

  useEffect(() => {
    if (!hasInitialFetch) {
      fetchData();
    }
  }, [hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    isLoading,
    usage,
    error,
    revalidate,
  };
}
