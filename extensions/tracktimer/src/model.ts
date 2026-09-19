import type { TimeEntry } from "./api";

export function recentEntries(entries: TimeEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (entry.status !== "completed") return false;
    const key = JSON.stringify([entry.projectId, entry.note, entry.billable]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function duration(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** Older servers and cached entries may not include a resolved project color. */
export function displayColor(color: unknown): string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color : "#ff5c35";
}
