import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { DroidUsage, DroidUsageTier, DroidError } from "./types";

const DROID_USAGE_API = "https://api.factory.ai/api/organization/subscription/schedule";
const REQUEST_TIMEOUT = 10000;

type Preferences = Preferences.AgentUsage;

async function fetchDroidUsage(token: string): Promise<{ usage: DroidUsage | null; error: DroidError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // 规范化 token 格式
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    const response = await fetch(DROID_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: authHeader,
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

    // 解析 API 响应
    return parseDroidApiResponse(data);
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

function parseDroidApiResponse(data: unknown): { usage: DroidUsage | null; error: DroidError | null } {
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
      usage?: {
        startDate?: number;
        endDate?: number;
        standard?: Partial<DroidUsageTier>;
        premium?: Partial<DroidUsageTier>;
      };
    };

    const usage = response.usage;

    if (!usage) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing usage data in API response",
        },
      };
    }

    const standard: DroidUsageTier = {
      userTokens: usage.standard?.userTokens ?? 0,
      orgTotalTokensUsed: usage.standard?.orgTotalTokensUsed ?? 0,
      orgOverageUsed: usage.standard?.orgOverageUsed ?? 0,
      basicAllowance: usage.standard?.basicAllowance ?? 0,
      totalAllowance: usage.standard?.totalAllowance ?? 0,
      orgOverageLimit: usage.standard?.orgOverageLimit ?? 0,
      usedRatio: usage.standard?.usedRatio ?? 0,
    };

    const premium: DroidUsageTier = {
      userTokens: usage.premium?.userTokens ?? 0,
      orgTotalTokensUsed: usage.premium?.orgTotalTokensUsed ?? 0,
      orgOverageUsed: usage.premium?.orgOverageUsed ?? 0,
      basicAllowance: usage.premium?.basicAllowance ?? 0,
      totalAllowance: usage.premium?.totalAllowance ?? 0,
      orgOverageLimit: usage.premium?.orgOverageLimit ?? 0,
      usedRatio: usage.premium?.usedRatio ?? 0,
    };

    return {
      usage: {
        startDate: usage.startDate ?? 0,
        endDate: usage.endDate ?? 0,
        standard,
        premium,
      },
      error: null,
    };
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

export function useDroidUsage() {
  const [token, setToken] = useState<string>("");
  const [usage, setUsage] = useState<DroidUsage | null>(null);
  const [error, setError] = useState<DroidError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  // 从偏好设置读取 token
  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();
    const savedToken = preferences.droidAuthToken?.trim() || "";
    setToken(savedToken);
  }, []);

  // 获取数据的函数
  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchDroidUsage(token);

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, [token]);

  // 首次加载时获取数据
  useEffect(() => {
    if (!hasInitialFetch && token) {
      fetchData();
    }
  }, [token, hasInitialFetch, fetchData]);

  // 重新验证（手动刷新）
  const revalidate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // 如果没有配置 token，显示配置错误
  const finalError: DroidError | null =
    !token && hasInitialFetch
      ? {
          type: "not_configured",
          message: "Droid token not configured. Please add it in extension settings (Cmd+,).",
        }
      : error;

  return {
    isLoading,
    usage,
    error: finalError,
    revalidate,
  };
}
