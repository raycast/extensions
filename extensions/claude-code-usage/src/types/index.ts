export type RawMoney = {
  amount_minor: number;
  currency: string;
  exponent: number;
};

export type RawRateLimitWindow = {
  utilization?: number | null;
  resets_at?: string | number | null;
};

export type RawExtraUsage = {
  is_enabled?: boolean;
  monthly_limit?: number | null;
  used_credits?: number | null;
  utilization?: number | null;
  currency?: string | null;
  resets_at?: string | number | null;
};

export type RawSpend = {
  used: RawMoney;
  limit: RawMoney | null;
  percent: number;
  enabled?: boolean;
  disabled_reason?: string | null;
  resets_at?: string | number | null;
};

export type RawUsage = {
  five_hour?: RawRateLimitWindow | null;
  seven_day?: RawRateLimitWindow | null;
  seven_day_sonnet?: RawRateLimitWindow | null;
  extra_usage?: RawExtraUsage | null;
  spend?: RawSpend | null;
};

export type AccountProfile = {
  plan: string | null;
  organizationName: string | null;
  rateLimitTier: string | null;
  email: string | null;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  plan?: string | null;
  profile?: AccountProfile | null;
};

export type Spend = {
  usedAmount: number;
  limitAmount: number | null;
  currency: string;
  percent: number;
  resetsAt: number | null;
};

export type RateLimitWindow = {
  utilization: number;
  resetsAt: number | null;
};

export type RateLimits = {
  fiveHour: RateLimitWindow | null;
  sevenDay: RateLimitWindow | null;
  sevenDaySonnet: RateLimitWindow | null;
};

export type Usage = {
  spend: Spend | null;
  rateLimits: RateLimits;
  plan: string | null;
  organization: string | null;
  rateLimitTier: string | null;
  email: string | null;
  fetchedAt: number;
};

export type TitleMode =
  | "icon-percent"
  | "icon-full"
  | "icon-short"
  | "percent"
  | "full"
  | "short"
  | "icon";

export type PrimaryMetric =
  "smart" | "session" | "weekly" | "weekly-sonnet" | "spend";
