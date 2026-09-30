export interface ClaudeRateWindow {
  percentageRemaining: number;
  resetsIn: string | null;
}

export interface ClaudeExtraUsage {
  used: number;
  limit: number;
  currency: string;
}

/** Who a config dir is signed in as, read from Claude Code's own config. */
export interface ClaudeAccountIdentity {
  email: string | null;
  displayName: string | null;
  organizationName: string | null;
}

export interface ClaudeUsage {
  plan: string;
  fiveHour: ClaudeRateWindow;
  sevenDay: ClaudeRateWindow | null;
  modelWindows: Record<string, ClaudeRateWindow>;
  extraUsage: ClaudeExtraUsage | null;
  identity: ClaudeAccountIdentity | null;
}

export interface ClaudeError {
  type: "not_configured" | "missing_scope" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
