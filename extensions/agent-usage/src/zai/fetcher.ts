import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { ZaiUsage, ZaiError, ZaiLimitEntry, ZaiUsageDetail } from "./types";

const ZAI_USAGE_API = "https://api.z.ai/api/monitor/usage/quota/limit";
const REQUEST_TIMEOUT = 10000;

type Preferences = Preferences.AgentUsage;

async function fetchZaiUsage(token: string): Promise<{ usage: ZaiUsage | null; error: ZaiError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    const response = await fetch(ZAI_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
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

    return parseZaiApiResponse(data);
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

interface ZaiApiLimitEntry {
  type: string;
  unit: number;
  number: number;
  usage: number | null;
  currentValue: number | null;
  remaining: number | null;
  percentage: number;
  usageDetails?: Array<{ modelCode: string; usage: number }> | null;
  nextResetTime: number | null;
}

interface ZaiApiResponse {
  code: number;
  msg: string;
  success: boolean;
  data?: {
    limits?: ZaiApiLimitEntry[];
    planName?: string;
    plan?: string;
    plan_type?: string;
    packageName?: string;
  };
}

function unitToLabel(unit: number): string {
  switch (unit) {
    case 1:
      return "days";
    case 3:
      return "hours";
    case 5:
      return "minutes";
    default:
      return "units";
  }
}

function buildWindowDescription(unit: number, num: number): string {
  return `${num} ${unitToLabel(unit)}`;
}

function parseLimitEntry(entry: ZaiApiLimitEntry): ZaiLimitEntry {
  const usageDetails: ZaiUsageDetail[] = (entry.usageDetails ?? []).map((d) => ({
    modelCode: d.modelCode,
    usage: d.usage,
  }));

  const resetTime = entry.nextResetTime != null ? new Date(entry.nextResetTime).toISOString() : null;

  return {
    type: entry.type as "TOKENS_LIMIT" | "TIME_LIMIT",
    windowDescription: buildWindowDescription(entry.unit, entry.number),
    usage: entry.usage ?? null,
    currentValue: entry.currentValue ?? null,
    remaining: entry.remaining ?? null,
    percentage: entry.percentage,
    usageDetails,
    resetTime,
  };
}

function parseZaiApiResponse(data: unknown): { usage: ZaiUsage | null; error: ZaiError | null } {
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

    const response = data as ZaiApiResponse;

    if (response.success !== true || response.code !== 200) {
      return {
        usage: null,
        error: {
          type: "api_error",
          message: response.msg || "API returned an error",
        },
      };
    }

    const limits = response.data?.limits;

    if (!limits || !Array.isArray(limits)) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "No limits data found in API response",
        },
      };
    }

    const tokenEntry = limits.find((l) => l.type === "TOKENS_LIMIT");
    const timeEntry = limits.find((l) => l.type === "TIME_LIMIT");

    const planName =
      response.data?.planName ?? response.data?.plan ?? response.data?.plan_type ?? response.data?.packageName ?? null;

    const usage: ZaiUsage = {
      tokenLimit: tokenEntry ? parseLimitEntry(tokenEntry) : null,
      timeLimit: timeEntry ? parseLimitEntry(timeEntry) : null,
      planName,
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

export function useZaiUsage() {
  const [token, setToken] = useState<string>("");
  const [usage, setUsage] = useState<ZaiUsage | null>(null);
  const [error, setError] = useState<ZaiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();
    const savedToken = preferences.zaiApiToken?.trim() || "";
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

    const result = await fetchZaiUsage(token);

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

  const finalError: ZaiError | null =
    !token && hasInitialFetch
      ? {
          type: "not_configured",
          message: "z.ai token not configured. Please add it in extension settings (Cmd+,).",
        }
      : error;

  return {
    isLoading,
    usage,
    error: finalError,
    revalidate,
  };
}
