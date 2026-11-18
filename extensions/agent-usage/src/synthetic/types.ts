export interface SyntheticQuotaBucket {
  limit: number;
  requests: number;
  renewsAt: string;
}

export interface SyntheticUsage {
  /** Total monthly subscription quota */
  subscription: SyntheticQuotaBucket;
  /** Search hourly quota */
  search: {
    hourly: SyntheticQuotaBucket;
  };
  /** Free tool calls daily quota */
  freeToolCalls: SyntheticQuotaBucket;
}

export interface SyntheticError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
