/**
 * Render a text-based progress bar.
 * @param pct – percentage 0-100
 * @returns string like "████████░░░░░░░░░░░░" (20 chars total)
 */
export function progressBar(pct: number): string {
  const filled = Math.round(pct / 5);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param ms – duration in milliseconds
 * @returns string like "42s", "3m 12s", "5m"
 */
export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}
