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

export function useDroidUsage(enabled = true): import("../agents/types").UsageState<DroidUsage, DroidError> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCachedPromise } = require("@raycast/utils") as typeof import("@raycast/utils");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCallback } = require("react") as typeof import("react");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetchTtlCache, getTtlMs } = require("../agents/hooks") as typeof import("../agents/hooks");

  const ttlKey = "ttl-droid";
  const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
  const isStale = Date.now() - lastFetched > getTtlMs();

  const fetcherFn = useCallback(async () => {
    fetchTtlCache.set(ttlKey, String(Date.now()));
    const { accessToken } = await resolveDroidAuth();

    if (!accessToken) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "Droid not configured. Run `droid` to log in (auto-detected from ~/.factory/auth.v2.* or ~/.factory/auth.*).",
        } as DroidError,
        timestamp: Date.now(),
      };
    }

    const result = await fetchDroidUsage(accessToken);
    return { ...result, timestamp: Date.now() };
  }, [ttlKey]);

  const { data, isLoading, mutate } = useCachedPromise(fetcherFn, ["droid"], {
    execute: enabled && isStale,
    initialData: { usage: null, error: null, timestamp: 0 },
  });

  return {
    isLoading: enabled ? (data?.usage ? false : isLoading) : false,
    usage: enabled && data ? data.usage : null,
    error: enabled && data ? data.error : null,
    revalidate: async () => {
      await mutate();
    },
    lastFetchedAt: data?.timestamp,
  };
}
