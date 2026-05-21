import type { Entry, EntryGroup } from "./types";

const MS_PER_DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupLabel(d: Date | null, todayStart: number): string {
  if (!d) return "Unknown date";
  const diffDays = Math.round((todayStart - startOfDay(d)) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier This Week";
  if (diffDays < 30) return "Earlier This Month";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export function groupEntriesByRecency(entries: Entry[]): EntryGroup[] {
  const todayStart = startOfDay(new Date());
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const label = groupLabel(entry.startedAt, todayStart);
    const bucket = groups.get(label);
    if (bucket) bucket.push(entry);
    else groups.set(label, [entry]);
  }
  return Array.from(groups, ([label, entries]) => ({ label, entries }));
}
