export interface CodexUsage {
  account: string;
  fiveHourLimit: {
    percentageRemaining: number;
    resetsInSeconds: number;
    limitWindowSeconds: number;
  };
  weeklyLimit: {
    percentageRemaining: number;
    resetsInSeconds: number;
    limitWindowSeconds: number;
  };
  codeReviewLimit?: {
    percentageRemaining: number;
    resetsInSeconds: number;
    limitWindowSeconds: number;
  };
  credits: {
    hasCredits: boolean;
    unlimited: boolean;
    balance: string;
  };
}

export interface CodexError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
