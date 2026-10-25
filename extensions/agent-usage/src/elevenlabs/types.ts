export interface ElevenLabsUsage {
  /** Plan label, e.g. "Creator" or "Growing Business". */
  plan: string | null;
  /** Subscription status when it is not "active", e.g. "past_due". */
  status: string | null;
  /** Credits used this billing cycle. */
  creditsUsed: number;
  /** The cycle's credit allowance. */
  creditLimit: number;
  /** Credits still available this cycle. */
  creditsRemaining: number;
  /** Remaining share of the allowance, or null when there is no positive allowance to measure against. */
  percentageRemaining: number | null;
  /** ISO timestamp of the next credit reset. */
  resetsAt: string | null;
}

export interface ElevenLabsError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
