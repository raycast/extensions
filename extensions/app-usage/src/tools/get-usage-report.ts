import { environment } from "@raycast/api";
import { buildReport, hourProfiles, peakHourLabel, rangeDates } from "../core/report";
import { createStore } from "../core/store";

type Input = {
  /**
   * Exact supported local calendar range. last7 and last30 include today.
   * Use today only when no period was specified. Never map last year or another
   * unsupported period to last30 or any other value. Use unsupported instead.
   */
  range: "today" | "yesterday" | "last7" | "last30" | "unsupported";
};

/**
 * Read sampled app usage for supported periods only. For an unsupported period such
 * as last year, use range unsupported and ask the user to choose a supported period.
 * Durations are seconds; hours arrays contain 24 local hour buckets, starting at midnight.
 * Always include "X of Y days recorded" in multi-day answers, where X is daysWithData
 * and Y is dates.length. Missing days are unknown, not zero usage.
 */
export default async function getUsageReport({ range }: Input) {
  if (range === "unsupported" || !["today", "yesterday", "last7", "last30"].includes(range)) {
    return {
      error: "Unsupported period. Ask the user to choose a supported period. Do not substitute another period.",
      supportedRanges: ["today", "yesterday", "last 7 days", "last 30 days"],
    };
  }

  const store = createStore(environment.supportPath);
  const dates = rangeDates(range, Date.now());
  const days = await Promise.all(dates.map(async (date) => ({ date, file: await store.readDay(date) })));
  const report = buildReport(days);

  return {
    range,
    dates: report.dates,
    daysWithData: report.daysWithData,
    totalActiveSeconds: report.totalSeconds,
    idleSeconds: report.idleSeconds,
    idleHours: report.idleHours,
    busiestHour: peakHourLabel(hourProfiles(report).active, dates.length > 1),
    apps: report.rows.map(({ name, seconds, share, hours, activeDays }) => ({
      name,
      seconds,
      share,
      hours,
      activeDays,
    })),
  };
}
