import { MiniMaxUsage, MiniMaxError } from "./types";
import { httpFetch } from "../agents/http";
import { resolveMiniMaxAuthTokens } from "./auth";

type Preferences = Preferences.AgentUsage;

const MINIMAX_USAGE_API = "https://www.minimax.io/v1/api/openplatform/coding_plan/remains";

interface MiniMaxApiResponse {
  model_remains: Array<{
    start_time: number;
    end_time: number;
    remains_time: number;
    current_interval_total_count: number;
    current_interval_usage_count: number;
    model_name: string;
    current_weekly_total_count: number;
    current_weekly_usage_count: number;
    weekly_start_time: number;
    weekly_end_time: number;
    weekly_remains_time: number;
  }>;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

function parseMiniMaxApiResponse(data: unknown): { usage: MiniMaxUsage | null; error: MiniMaxError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as MiniMaxApiResponse;

    if (response.base_resp?.status_code !== 0) {
      return {
        usage: null,
        error: { type: "api_error", message: response.base_resp?.status_msg || "API returned an error" },
      };
    }

    const usage: MiniMaxUsage = {
      modelRemains: response.model_remains || [],
      planName: null,
    };

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}

async function fetchMiniMaxUsage(token: string): Promise<{ usage: MiniMaxUsage | null; error: MiniMaxError | null }> {
  const { data, error } = await httpFetch({
    url: MINIMAX_USAGE_API,
    token,
    headers: { "Content-Type": "application/json" },
  });
  if (error) {
    return { usage: null, error };
  }
  return parseMiniMaxApiResponse(data);
}

export function useMiniMaxUsage(enabled = true): import("../agents/types").UsageState<MiniMaxUsage, MiniMaxError> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getPreferenceValues } = require("@raycast/api") as typeof import("@raycast/api");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCachedPromise } = require("@raycast/utils") as typeof import("@raycast/utils");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCallback } = require("react") as typeof import("react");

  const preferences = getPreferenceValues<Preferences>();
  const preferenceToken = preferences.minimaxApiToken?.trim() || "";

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetchTtlCache, getTtlMs } = require("../agents/hooks") as typeof import("../agents/hooks");

  const ttlKey = "ttl-minimax";
  const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
  const isStale = Date.now() - lastFetched > getTtlMs();

  const fetcherFn = useCallback(
    async (prefToken: string) => {
      fetchTtlCache.set(ttlKey, String(Date.now()));
      const { primaryToken } = await resolveMiniMaxAuthTokens({ preferenceToken: prefToken });

      if (!primaryToken) {
        return {
          usage: null,
          error: {
            type: "not_configured",
            message:
              "MiniMax token not configured. Add it in extension settings (Cmd+,) or set MINIMAX_API_KEY in your shell.",
          } as MiniMaxError,
          timestamp: Date.now(),
        };
      }

      const result = await fetchMiniMaxUsage(primaryToken);
      return { ...result, timestamp: Date.now() };
    },
    [ttlKey],
  );

  const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [preferenceToken], {
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
