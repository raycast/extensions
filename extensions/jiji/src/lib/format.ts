/** Formats a metric percent for display: "33%", or "—" when unknown. */
export function formatPercent(percent: number | null): string {
  if (percent == null) return "—";
  return `${Math.round(percent)}%`;
}

/**
 * Compact time-until-reset for tight spots like the menu-bar title:
 * "3h 12m", "45m", "2d 5h", or "soon". Returns null when there's no
 * (parseable) timestamp. `now` is injectable for deterministic tests.
 */
export function resetDuration(resetsAt: string | null, now: Date = new Date()): string | null {
  if (!resetsAt) return null;

  const target = new Date(resetsAt);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 60_000) return "soon";

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

/**
 * Full reset sentence for the dropdown, e.g. "Resets in 3h 12m" / "Resets soon".
 * Returns null when there's no (parseable) timestamp.
 */
export function formatReset(resetsAt: string | null, now: Date = new Date()): string | null {
  const d = resetDuration(resetsAt, now);
  if (d == null) return null;
  return d === "soon" ? "Resets soon" : `Resets in ${d}`;
}

/**
 * "Last updated" relative string, e.g. "just now", "2m ago", "1h ago".
 * `now` is injectable for deterministic tests.
 */
export function formatLastUpdated(updatedAt: Date | null, now: Date = new Date()): string {
  if (!updatedAt) return "never";

  const diffMs = now.getTime() - updatedAt.getTime();
  if (diffMs < 60_000) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
