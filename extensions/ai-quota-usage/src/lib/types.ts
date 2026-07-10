/** A single subscription rate-limit window (5-hour, weekly, or per-model weekly). */
export interface QuotaWindow {
  /** Display name, e.g. "5-Hour", "Weekly", "Weekly · Opus". */
  name: string;
  /** 0-100, percent of the window's allowance already consumed. */
  usedPercent: number;
  /** Unix seconds when the window's usage returns to zero. */
  resetsAt: number;
}

/** Where a tool's quota numbers came from. */
export type QuotaSource = "live" | "snapshot";

/** A tool's quota state, normalised across Claude Code and Codex. */
export interface ToolQuota {
  /** Display label — "Claude Code" | "Codex". */
  tool: string;
  /** Rate-limit windows (empty when unavailable — see `error`). */
  windows: QuotaWindow[];
  /** Plan name when known, e.g. "plus". */
  planType?: string;
  /** `live` = fetched from an endpoint now; `snapshot` = read from a local log. */
  source: QuotaSource;
  /** Unix seconds the data reflects (snapshot capture time, or live fetch time); 0 = unknown. */
  fetchedAt: number;
  /** Cumulative session token total, when available (Codex snapshot). */
  totalTokens?: number;
  /** Human-readable reason quota is unavailable, when `windows` is empty. */
  error?: string;
}

/** Token + cost usage over a period. */
export interface UsagePeriod {
  totalTokens: number;
  /** US dollars. */
  cost: number;
}

/** A tool's consumption (tokens/cost), computed by the ccusage CLI from local logs. */
export interface ToolUsage {
  tool: string;
  today?: UsagePeriod;
  week?: UsagePeriod;
  /** Human-readable reason usage is unavailable. */
  error?: string;
}
