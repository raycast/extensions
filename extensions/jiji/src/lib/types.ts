/** A single usage window: percent used (0–100) and when it resets. */
export interface Metric {
  /** Utilization as a percentage in 0…100. */
  percent: number;
  /** ISO 8601 timestamp of when this window resets, or null if unknown. */
  resetsAt: string | null;
}

/** A per-model weekly window, e.g. { label: "Opus", metric }. */
export interface ModelUsage {
  label: string;
  metric: Metric;
}

/**
 * The usage windows Jiji tracks, mirroring claude.ai's usage page.
 * Any window may be null when claude.ai does not report it.
 */
export interface Usage {
  /** Rolling 5-hour window → "Current session". */
  session: Metric | null;
  /** 7-day window across all models → "Weekly (all models)". */
  weeklyAll: Metric | null;
  /** Per-model weekly windows (Opus, Sonnet, Fable, …) that are present. */
  models: ModelUsage[];
}

/**
 * The Jiji mood, derived from the highest (most pressing) usage percentage.
 * Ported 1:1 from `Sources/Jiji/JijiState.swift`.
 */
export type Mood = "chill" | "alert" | "sideEye" | "worried" | "panic" | "dead";
