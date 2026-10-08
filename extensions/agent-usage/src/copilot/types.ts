export interface CopilotUsage {
  plan: string;
  aiCreditsRemainingPercent: number | null;
  aiCreditsRemaining: number | null;
  aiCreditsEntitlement: number | null;
  /** Kept optional so usage cached by older extension versions still renders correctly. */
  premiumRemaining?: number | null;
  chatRemaining: number | null;
  quotaResetDate: string | null;
}

export interface CopilotError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
