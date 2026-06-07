import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
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

export function useMiniMaxUsage(enabled = true) {
  const [usage, setUsage] = useState<MiniMaxUsage | null>(null);
  const [error, setError] = useState<MiniMaxError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const preferences = getPreferenceValues<Preferences>();
    const preferenceToken = preferences.minimaxApiToken?.trim() || "";
    const { primaryToken } = await resolveMiniMaxAuthTokens({ preferenceToken });

    if (!primaryToken) {
      setUsage(null);
      setError({
        type: "not_configured",
        message:
          "MiniMax token not configured. Add it in extension settings (Cmd+,) or set MINIMAX_API_KEY in your shell.",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    const result = await fetchMiniMaxUsage(primaryToken);
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
