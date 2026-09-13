/** Keep the end of a location readable without letting it crowd the status. */
export function compactScopeLabel(scope: string): string {
  const parts = scope.replace(/\s+/gu, " ").split("/").filter(Boolean);
  const label = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : scope;
  const chars = Array.from(label.replace(/\s+/gu, " "));
  return chars.length > 40
    ? `${chars.slice(0, 25).join("")}…${chars.slice(-14).join("")}`
    : chars.join("");
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function relativeTime(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}
