export interface MinimaxCNModelRemain {
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
}

export interface MinimaxCNUsage {
  modelRemains: MinimaxCNModelRemain[];
  planName: string | null;
}

export interface MinimaxCNError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "api_error" | "unknown";
  message: string;
}
