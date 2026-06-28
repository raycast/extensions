export interface MiniMaxModelRemain {
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
}

export interface MiniMaxUsage {
  modelRemains: MiniMaxModelRemain[];
  planName: string | null;
}

export interface MiniMaxError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "api_error" | "unknown";
  message: string;
}
