/** Localized absolute timestamp, e.g. "Jul 24, 2026, 10:24 AM". Falls back to the raw string. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Compact relative time, e.g. "5m ago", "3h ago". Empty string for an unparseable input. */
export function timeAgo(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
