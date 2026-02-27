export interface RateLimitWindow {
  utilization: number;
  resets_at: string;
}

export interface ExtraUsage {
  is_enabled: boolean;
  monthly_limit: number;
  used_credits: number;
  utilization: number | null;
}

export interface UsageApiResponse {
  five_hour: RateLimitWindow;
  seven_day: RateLimitWindow;
  seven_day_oauth_apps: RateLimitWindow | null;
  seven_day_opus: RateLimitWindow | null;
  seven_day_sonnet: RateLimitWindow | null;
  seven_day_cowork: RateLimitWindow | null;
  iguana_necktie: RateLimitWindow | null;
  extra_usage: ExtraUsage | null;
}

export interface ClaudeOAuthCredentials {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface SessionMessage {
  type: string;
  timestamp: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  costUSD?: number;
}

export interface SessionSummary {
  sessionId: string;
  projectDir: string;
  projectPath: string;
  totalTokens: TokenUsage;
  messageCount: number;
  model: string;
  firstTimestamp: string;
  lastTimestamp: string;
  costUSD: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface ProjectSummary {
  projectDir: string;
  projectPath: string;
  sessions: SessionSummary[];
  totalTokens: TokenUsage;
  totalCost: number;
  sessionCount: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cacheCreationCost: number;
  cacheReadCost: number;
  totalCost: number;
}

export type ModelTier = "opus" | "sonnet";

export interface CodexUsageResponse {
  plan_type: string;
  rate_limit?: {
    primary_window?: {
      used_percent: number;
      reset_at: number;
      limit_window_seconds: number;
    };
    secondary_window?: {
      used_percent: number;
      reset_at: number;
      limit_window_seconds: number;
    };
  };
  credits?: {
    has_credits: boolean;
    unlimited: boolean;
    balance: number | null;
  };
}

export type TimeRange = "today" | "week" | "month" | "all";

export interface SessionsIndex {
  version: number;
  entries: unknown[];
  originalPath: string;
}
