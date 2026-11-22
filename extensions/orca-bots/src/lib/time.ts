const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Elapsed time since `sinceMs` in US English: "just now" under 60s, then "Nm ago", "Nh ago", "Nd ago".
 * Values are floored (59m 59s stays "59m ago"). A start in the future counts as "just now".
 */
export function formatSince(sinceMs: number, nowMs: number): string {
  const elapsed = Math.max(0, nowMs - sinceMs);
  if (elapsed < MINUTE_MS) {
    return "just now";
  }
  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  }
  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  }
  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}
