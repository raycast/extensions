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
 * Section bucket for grouping by recency.
 */
export function ageSection(ts: string, now: Date = new Date()): "Today" | "Yesterday" | "Earlier" {
  const hours = (now.getTime() - new Date(ts).getTime()) / 3_600_000;
  if (hours < 24) return "Today";
  if (hours < 48) return "Yesterday";
  return "Earlier";
}

/**
 * Last path segment with the `.md` extension stripped.
 */
export function displayTitle(absPath: string): string {
  const filename = absPath.split("/").pop() ?? absPath;
  return filename.replace(/\.md$/, "");
}
