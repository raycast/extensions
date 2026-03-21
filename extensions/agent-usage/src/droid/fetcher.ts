import { useState, useEffect, useCallback, useRef } from "react";
import { DroidUsage, DroidUsageTier, DroidError } from "./types";
import { resolveDroidAuth } from "./auth";
import { httpFetch } from "../agents/http";

const DROID_USAGE_API = "https://api.factory.ai/api/organization/subscription/schedule";

const DROID_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchDroidUsage(token: string): Promise<{ usage: DroidUsage | null; error: DroidError | null }> {
  const { data, error } = await httpFetch({ url: DROID_USAGE_API, token, headers: DROID_HEADERS });
  if (error) return { usage: null, error };
  return parseDroidApiResponse(data);
}

function parseDroidApiResponse(data: unknown): { usage: DroidUsage | null; error: DroidError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
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
      return { usage: null, error: { type: "parse_error", message: "Missing usage data in API response" } };
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
      usage: { startDate: usage.startDate ?? 0, endDate: usage.endDate ?? 0, standard, premium },
      error: null,
    };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}

export function useDroidUsage(enabled = true) {
  const [usage, setUsage] = useState<DroidUsage | null>(null);
  const [error, setError] = useState<DroidError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const { accessToken } = await resolveDroidAuth();
    if (requestId !== requestIdRef.current) return;

    if (!accessToken) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "Droid not configured. Run `droid` to log in (auto-detected from ~/.factory/auth.*).",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    const result = await fetchDroidUsage(accessToken);
    if (requestId !== requestIdRef.current) return;

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
      void fetchData();
    }
  }, [enabled, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    if (!enabled) return;
    await fetchData();
  }, [enabled, fetchData]);

  return {
    isLoading: enabled ? isLoading : false,
    usage: enabled ? usage : null,
    error: enabled ? error : null,
    revalidate,
  };
}
