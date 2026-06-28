export interface ZaiUsageDetail {
  modelCode: string;
  usage: number;
}

export interface ZaiLimitEntry {
  type: "TOKENS_LIMIT" | "TIME_LIMIT";
  windowDescription: string;
  usage: number | null;
  currentValue: number | null;
  remaining: number | null;
  percentage: number;
  usageDetails: ZaiUsageDetail[];
  resetTime: string | null;
}

export interface ZaiUsage {
  tokenLimit: ZaiLimitEntry | null;
  timeLimit: ZaiLimitEntry | null;
  planName: string | null;
}

export interface ZaiError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "api_error" | "unknown";
  message: string;
}
