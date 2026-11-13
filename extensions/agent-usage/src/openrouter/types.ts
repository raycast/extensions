export interface OpenRouterUsage {
  /** Which endpoint produced the numbers: the account credit ledger, or a single key's spending cap. */
  source: "account" | "key";
  /** Credits purchased on the account, or the key's spending cap. Null when the key is uncapped. */
  totalCredits: number | null;
  /** Credits already spent. */
  totalUsage: number;
  /** Credits still available. Null when the key is uncapped, because no cap means no remainder. */
  remaining: number | null;
  /** Key label, only present for key-scoped results. */
  label?: string;
  /** True when the account has never purchased credits. */
  isFreeTier?: boolean;
}

export interface OpenRouterError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
