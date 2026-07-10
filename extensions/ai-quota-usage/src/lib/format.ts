import { Color } from "@raycast/api";

/** Remaining share of a window's allowance, as a 0-100 percent. */
export function remainingPercent(usedPercent: number): number {
  return Math.max(0, Math.min(100, 100 - usedPercent));
}

/** Countdown until `unixSeconds`, e.g. "2h 13m", "45m", "3d 4h". */
export function formatCountdown(unixSeconds: number, now: number = Date.now()): string {
  const diffMs = unixSeconds * 1000 - now;
  if (diffMs <= 0) return "resetting…";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** How long ago `unixSeconds` was, e.g. "just now", "5m ago", "3h ago". */
export function relativeTime(unixSeconds: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - unixSeconds * 1000) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Green / yellow / red by how close `remaining` is to the warning `threshold`. */
export function remainingColor(remaining: number, threshold: number): Color {
  if (remaining <= threshold) return Color.Red;
  if (remaining <= threshold * 2) return Color.Yellow;
  return Color.Green;
}

/** Compact token count, e.g. "2.49M", "62.1K", "540". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
