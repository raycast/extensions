export interface CodexRateLimitWindow {
  percentageRemaining: number;
  resetsInSeconds: number;
  limitWindowSeconds: number;
}

export interface CodexAdditionalRateLimit {
  name: string;
  meteredFeature?: string;
  windows: CodexRateLimitWindow[];
}

export interface CodexUsage {
  account: string;
  displayName?: string;
  fiveHourLimit?: CodexRateLimitWindow;
  weeklyLimit?: CodexRateLimitWindow;
  codeReviewLimit?: CodexRateLimitWindow;
  additionalRateLimits?: CodexAdditionalRateLimit[];
  credits: {
    hasCredits: boolean;
    unlimited: boolean;
    balance: string;
  };
  resetCredits?: {
    availableCount: number | null;
    expiresAtList: string[];
  };
  resetCreditsError?: string;
}

export interface CodexError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
