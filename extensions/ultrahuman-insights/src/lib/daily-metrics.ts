import { DailyMetricsRange } from "./types";

/** Return a copy of the range sorted ascending by date. */
export function sortByDate(range: DailyMetricsRange): DailyMetricsRange {
  return [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

/** Map YYYY-MM-DD dates to short weekday labels (Mon, Tue, …). */
export function weekdayShortLabels(dates: Array<string | undefined>): string[] {
  return dates.map((d) => {
    if (!d) return "";
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });
}
