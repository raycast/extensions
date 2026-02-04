// Types for API data

// Model aggregation from get-aggregated-usage-events API
export interface ModelAggregation {
  modelIntent: string;
  inputTokens?: string;
  outputTokens?: string;
  cacheWriteTokens?: string;
  cacheReadTokens?: string;
  totalCents: number | null | undefined;
}

// Response from get-aggregated-usage-events API
export interface CursorUsageData {
  aggregations: ModelAggregation[];
  totalInputTokens?: string;
  totalOutputTokens?: string;
  totalCacheWriteTokens?: string;
  totalCacheReadTokens?: string;
  totalCostCents: number | null | undefined;
}

// Plan usage details from usage-summary API
// Note: used, limit, remaining are in CENTS (e.g., 1207 = $12.07)
export interface PlanUsage {
  enabled: boolean;
  used: number; // cents
  limit: number; // cents
  remaining: number; // cents
  breakdown: {
    included: number; // cents
    bonus: number; // cents
    total: number; // cents
  };
}

// On-demand usage details from usage-summary API
export interface OnDemandUsage {
  enabled: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

// Response from usage-summary API
export interface UsageSummary {
  billingCycleStart: string;
  billingCycleEnd: string;
  membershipType: string;
  limitType: string;
  isUnlimited: boolean;
  individualUsage: {
    plan: PlanUsage;
    onDemand: OnDemandUsage;
  };
  teamUsage: Record<string, unknown>;
}

// Combined data from both APIs
export interface CombinedUsageData {
  usage: CursorUsageData;
  summary: UsageSummary | null;
}

// Menu bar display options
export type MenuBarDisplayOption = "cost" | "usage" | "percent" | "both";

// Date range source options
export type DateRangeSource = "billing" | "month";

// Menu bar icon options
export type MenuBarIconOption = "cursor" | "progress";

// Model info display options
export type ModelInfoDisplayOption = "both" | "cost" | "tokens" | "none";

// Extension preferences (global)
export interface Preferences {
  workosSessionToken: string;
  revalidationIntervalMinutes?: string;
  dateRangeSource?: DateRangeSource;
}

// Token format options
export type TokenFormatOption = "short" | "full";

// Menu Bar command preferences
export interface MenuBarPreferences extends Preferences {
  menuBarDisplay?: MenuBarDisplayOption;
  menuBarIcon?: MenuBarIconOption;
  displayFormat?: string;
  showDollarSign?: boolean;
  showSubscriptionSection?: boolean;
  showCostSection?: boolean;
  showModelsSection?: boolean;
  modelInfoDisplay?: ModelInfoDisplayOption;
  showModelPercent?: boolean;
  showTokensSection?: boolean;
  tokenFormat?: TokenFormatOption;
  showRefreshButton?: boolean;
  showSettingsButton?: boolean;
}
