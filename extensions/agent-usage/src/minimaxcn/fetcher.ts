import { httpFetch } from "../agents/http.ts";
import type { MinimaxCNUsage, MinimaxCNError } from "./types.ts";

const MINIMAX_CN_USAGE_API = "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains";

interface MinimaxCNApiResponse {
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
    current_interval_status?: number;
    current_interval_remaining_percent?: number;
    current_weekly_status?: number;
    current_weekly_remaining_percent?: number;
  }>;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

function parseMinimaxCNApiResponse(data: unknown): { usage: MinimaxCNUsage | null; error: MinimaxCNError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as MinimaxCNApiResponse;

    if (response.base_resp?.status_code !== 0) {
      return {
        usage: null,
        error: { type: "api_error", message: response.base_resp?.status_msg || "API returned an error" },
      };
    }

    const usage: MinimaxCNUsage = {
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

export async function fetchMinimaxCNUsage(
  token: string,
): Promise<{ usage: MinimaxCNUsage | null; error: MinimaxCNError | null }> {
  const { data, error } = await httpFetch({
    url: MINIMAX_CN_USAGE_API,
    token,
    headers: { "Content-Type": "application/json" },
  });
  if (error) {
    return { usage: null, error };
  }
  return parseMinimaxCNApiResponse(data);
}
