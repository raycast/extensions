/**
 * Render a Date as a coarse relative-time string (e.g. "5m ago", "2d ago"),
 * falling back to a locale date for anything older than 30 days.
 */
export function formatRelative(date: Date | undefined): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString();
}
