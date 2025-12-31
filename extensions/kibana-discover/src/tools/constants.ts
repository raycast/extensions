import type { TimeRange } from "../types";

// Time range options
export const TIME_RANGES: TimeRange[] = [
  { label: "Last 15 minutes", from: "now-15m", to: "now" },
  { label: "Last 30 minutes", from: "now-30m", to: "now" },
  { label: "Last 1 hour", from: "now-1h", to: "now" },
  { label: "Last 24 hours", from: "now-24h", to: "now" },
  { label: "Last 7 days", from: "now-7d", to: "now" },
  { label: "Today", from: "now/d", to: "now/d" },
  { label: "This week", from: "now/w", to: "now/w" },
];

export const DEFAULT_TIME_RANGE = "Last 15 minutes";

// Common log fields that users might want to select
export const COMMON_FIELDS = ["TraceId", "message", "level"];

export const DEFAULT_FIELDS = ["TraceId", "message", "level"];
