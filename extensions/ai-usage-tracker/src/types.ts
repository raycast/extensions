// Provider types
export type ProviderType = "claude" | "codex" | "antigravity";

export interface UsageWindow {
  type: "session" | "weekly" | "model";
  label: string;
  used: number;
  limit: number;
  percentage: number;
  resetsAt: Date | null;
  pace?: {
    status: "ahead" | "behind" | "on-track";
    percentage: number;
  };
}

export interface CostData {
  today: number;
  todayTokens: number;
  last30Days: number;
  last30DaysTokens: number;
  dailyHistory: DailyCost[];
}

export interface DailyCost {
  date: Date;
  cost: number;
  tokens: number;
}

export interface ProviderUsage {
  provider: ProviderType;
  name: string;
  icon: string;
  enabled: boolean;
  authenticated: boolean;
  lastUpdated: Date | null;
  error?: string;
  windows: UsageWindow[];
  cost?: CostData;
  accountEmail?: string;
  planName?: string;
}

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  icon: string;
  enabled: boolean;
}

export interface Preferences {
  claudeEnabled: boolean;
  codexEnabled: boolean;
  antigravityEnabled: boolean;
}

// Claude-specific types
export interface ClaudeOAuthUsageResponse {
  fiveHour?: {
    usage: number;
    limit: number;
    resetsAt: string;
  };
  sevenDay?: {
    usage: number;
    limit: number;
    resetsAt: string;
  };
  sevenDaySonnet?: {
    usage: number;
    limit: number;
    resetsAt: string;
  };
  sevenDayOpus?: {
    usage: number;
    limit: number;
    resetsAt: string;
  };
  extraUsage?: {
    spend: number;
    limit: number;
  };
}

export interface ClaudeWebUsageResponse {
  session_usage_percentage?: number;
  weekly_usage_percentage?: number;
  opus_usage_percentage?: number;
}

// Codex-specific types
export interface CodexUsageWindow {
  type: string;
  used: number;
  limit: number;
  resetsAt: string;
}

export interface CodexUsageResponse {
  usageWindows: CodexUsageWindow[];
  credits?: {
    balance: number;
    hasCredits: boolean;
    unlimited: boolean;
  };
}

// Antigravity-specific types
export interface AntigravityModelConfig {
  label: string;
  quotaInfo?: {
    remainingFraction: number;
    resetTime?: string;
  };
}

export interface AntigravityUserStatus {
  cascadeModelConfigData?: {
    clientModelConfigs: AntigravityModelConfig[];
  };
  accountEmail?: string;
  planName?: string;
}
