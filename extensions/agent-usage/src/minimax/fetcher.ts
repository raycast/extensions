import { MiniMaxUsage, MiniMaxError } from "./types";
import { httpFetch } from "../agents/http";

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

export async function fetchMiniMaxUsage(
  token: string,
): Promise<{ usage: MiniMaxUsage | null; error: MiniMaxError | null }> {
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
