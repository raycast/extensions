import { listEntriesForDay, summarizeDay, type Entry } from "daily-karte";

export function markdownText(value: string) {
  return value.replace(/[\\`*_[\]{}()<>#!|~]/g, (character) => `\\${character}`);
}

export function todayPresentation(all: Entry[], day: string) {
  const entries = listEntriesForDay(all, day);
  const summary = summarizeDay(entries, day);
  const timed = entries.filter((entry) => entry.duration !== null);
  return {
    entries,
    summary,
    unknownCount: entries.length - timed.length,
    averageMinutes: timed.length ? summary.totalMinutes / timed.length : null,
    activities: summary.byActivity.length,
  };
}
