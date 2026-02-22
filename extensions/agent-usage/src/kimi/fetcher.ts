import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";

const KIMI_USAGE_API = "https://www.kimi.com/apiv2/kimi.gateway.billing.v1.BillingService/GetUsages";
const REQUEST_TIMEOUT = 10000;

type Preferences = Preferences.AgentUsage;

async function fetchKimiUsage(token: string): Promise<{ usage: KimiUsage | null; error: KimiError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    const response = await fetch(KIMI_USAGE_API, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ scope: ["FEATURE_CODING"] }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Authorization token expired or invalid. Please update it in extension settings.",
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

    return parseKimiApiResponse(data);
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

interface KimiApiUsage {
  scope: string;
  detail: {
    limit: string;
    used: string;
    remaining: string;
    resetTime: string;
  };
  limits?: Array<{
    window: {
      duration: number;
      timeUnit: string;
    };
    detail: {
      limit: string;
      used: string;
      remaining: string;
      resetTime: string;
    };
  }>;
}

interface KimiApiResponse {
  usages?: KimiApiUsage[];
}

function parseKimiApiResponse(data: unknown): { usage: KimiUsage | null; error: KimiError | null } {
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

    const response = data as KimiApiResponse;

    const codingUsage = response.usages?.find((u) => u.scope === "FEATURE_CODING");

    if (!codingUsage) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "No coding usage data found in API response",
        },
      };
    }

    const weeklyDetail = codingUsage.detail;
    const rateLimitData = codingUsage.limits?.[0];

    if (!rateLimitData) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "No rate limit data found in API response",
        },
      };
    }

    const usage: KimiUsage = {
      weeklyUsage: {
        limit: parseInt(weeklyDetail.limit, 10),
        used: parseInt(weeklyDetail.used, 10),
        remaining: parseInt(weeklyDetail.remaining, 10),
        resetTime: weeklyDetail.resetTime,
      },
      rateLimit: {
        windowMinutes: rateLimitData.window.duration,
        limit: parseInt(rateLimitData.detail.limit, 10),
        used: parseInt(rateLimitData.detail.used, 10),
        remaining: parseInt(rateLimitData.detail.remaining, 10),
        resetTime: rateLimitData.detail.resetTime,
      },
    };

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

export function formatResetTime(isoTime: string): string {
  try {
    const resetDate = new Date(isoTime);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "now";
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
    }
    if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    }
    return `${diffSeconds}s`;
  } catch {
    return "unknown";
  }
}

export function useKimiUsage() {
  const [token, setToken] = useState<string>("");
  const [usage, setUsage] = useState<KimiUsage | null>(null);
  const [error, setError] = useState<KimiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();
    const savedToken = preferences.kimiAuthToken?.trim() || "";
    setToken(savedToken);
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchKimiUsage(token);

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, [token]);

  useEffect(() => {
    if (!hasInitialFetch && token) {
      fetchData();
    }
  }, [token, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const finalError: KimiError | null =
    !token && hasInitialFetch
      ? {
          type: "not_configured",
          message: "Kimi token not configured. Please add it in extension settings (Cmd+,).",
        }
      : error;

  return {
    isLoading,
    usage,
    error: finalError,
    revalidate,
  };
}
