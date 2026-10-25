export interface OpenAIApiUsage {
  /** Credit granted to the organization (purchases and promotional grants), in USD. */
  totalGranted: number;
  /** Credit already spent, in USD. */
  totalUsed: number;
  /** Credit still available, in USD. */
  totalAvailable: number;
  /** The soonest-expiring grant that still has credit left. */
  nextExpiringGrant: { remaining: number; expiresAt: string } | null;
}

export interface OpenAIApiError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
