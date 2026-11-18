export interface DroidUsageTier {
  userTokens: number;
  orgTotalTokensUsed: number;
  orgOverageUsed: number;
  basicAllowance: number;
  totalAllowance: number;
  orgOverageLimit: number;
  usedRatio: number;
}

export interface DroidUsage {
  startDate: number;
  endDate: number;
  standard: DroidUsageTier;
  premium: DroidUsageTier;
}

export interface DroidError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
