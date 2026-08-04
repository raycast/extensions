const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats a timestamp as a short relative age ("5m ago", "3d ago").
 *
 * Reddit results are overwhelmingly judged by recency, and an absolute
 * "7/1/2026, 1:07:33 PM" forces the reader to do that arithmetic themselves —
 * and eats the row width that the post title needs.
 */
export function relativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) {
    return "";
  }

  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const seconds = Math.round((Date.now() - then) / 1000);

  // Clock skew (or a post dated slightly in the future) shouldn't render as
  // "-3s ago".
  if (seconds < 0) {
    return "just now";
  }
  if (seconds < MINUTE) {
    return "just now";
  }
  if (seconds < HOUR) {
    return `${Math.floor(seconds / MINUTE)}m ago`;
  }
  if (seconds < DAY) {
    return `${Math.floor(seconds / HOUR)}h ago`;
  }
  if (seconds < MONTH) {
    return `${Math.floor(seconds / DAY)}d ago`;
  }
  if (seconds < YEAR) {
    return `${Math.floor(seconds / MONTH)}mo ago`;
  }
  return `${Math.floor(seconds / YEAR)}y ago`;
}

/** Absolute form, for tooltips and detail panes where precision is wanted. */
export function absoluteTime(isoTimestamp: string): string {
  if (!isoTimestamp) {
    return "";
  }
  const date = new Date(isoTimestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
