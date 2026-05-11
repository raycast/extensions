export interface CopilotUsage {
  plan: string;
  premiumRemaining: number | null;
  chatRemaining: number | null;
  quotaResetDate: string | null;
}

export interface CopilotError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
