export interface ClaudeRateWindow {
  percentageRemaining: number;
  resetsIn: string | null;
}

export interface ClaudeExtraUsage {
  used: number;
  limit: number;
  currency: string;
}

export interface ClaudeUsage {
  plan: string;
  fiveHour: ClaudeRateWindow;
  sevenDay: ClaudeRateWindow | null;
  sevenDayModel: ClaudeRateWindow | null;
  extraUsage: ClaudeExtraUsage | null;
}

export interface ClaudeError {
  type: "not_configured" | "missing_scope" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
