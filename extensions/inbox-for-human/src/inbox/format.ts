/**
 * Formatting helpers shared by the list view and detail panel.
 */

/**
 * Human-readable relative age, e.g. `42m`, `3h`, `2d`.
 */
export function relativeAge(ts: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(ts).getTime();
  if (ms < 0) return "just now";
  const minutes = ms / 60_000;
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(0, Math.floor(minutes))}m`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Section bucket for grouping by recency, by local calendar day: a file queued
 * at 10 p.m. shows under Yesterday the next morning.
 */
export function ageSection(ts: string, now: Date = new Date()): "Today" | "Yesterday" | "Earlier" {
  const date = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

/**
 * Last path segment with the `.md` extension stripped.
 */
export function displayTitle(absPath: string): string {
  const filename = absPath.split("/").pop() ?? absPath;
  return filename.replace(/\.md$/, "");
}
