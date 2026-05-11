/**
 * Format an ISO timestamp as a short relative-time string, e.g. "5m ago", "2h ago", "3d ago".
 * Falls back to "just now" for < 1 min and to a localized date string for very old entries.
 */
export function relativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) return "";

  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;

  return new Date(then).toISOString().slice(0, 10);
}
