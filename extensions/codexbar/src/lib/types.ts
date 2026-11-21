/** A rate-limit window as serialized by CodexBar (snapshot and CLI share this shape). */
export interface RawRateWindow {
  usedPercent?: number;
  resetsAt?: string | null;
  resetDescription?: string | null;
  windowMinutes?: number | null;
}

export interface LimitWindow {
  id: string;
  title: string;
  /** 0–100, how much of the window has been consumed. */
  usedPercent: number;
  resetsAt?: Date;
  windowMinutes?: number;
}

export interface ProviderUsage {
  provider: string;
  name: string;
  plan?: string;
  windows: LimitWindow[];
  todayCost?: number;
  todayTokens?: number;
  last30DaysCost?: number;
  last30DaysTokens?: number;
  currency: string;
  updatedAt?: Date;
  error?: string;
  /** The last manual refresh failed for this provider; the reading shown is older. */
  refreshError?: string;
  source: "app" | "cli";
}

export interface ModelCost {
  model: string;
  cost?: number;
  tokens?: number;
}

export interface DayCost {
  /** `YYYY-MM-DD` as reported by CodexBar. */
  date: string;
  cost?: number;
  tokens: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  models: ModelCost[];
}

export interface ProviderCost {
  provider: string;
  name: string;
  currency: string;
  todayCost?: number;
  todayTokens?: number;
  last30DaysCost?: number;
  last30DaysTokens?: number;
  days: DayCost[];
  updatedAt?: Date;
  error?: string;
}
