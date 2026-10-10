export interface RaycastUsage {
  /** Raycast plan label, e.g. "Pro" or "Pro+". */
  plan: string | null;
  /** AI credits still available this cycle. Rollover can push this above the total. */
  remainingCredits: number | null;
  /** The cycle's credit allowance. */
  totalCredits: number | null;
  /** Remaining share of the allowance, or null when there is no positive total to measure against. */
  percentageRemaining: number | null;
  /** ISO timestamp of the next monthly credit grant. */
  nextCreditsAt: string | null;
}

export interface RaycastError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
