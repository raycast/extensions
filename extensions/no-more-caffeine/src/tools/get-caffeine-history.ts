import { getHistoryStart, type HistoryRange, historyStats } from "../utils/history";
import { formatDateTime } from "../utils/statsSvg";
import { getIntakes } from "../utils/storage";
import { commandUrl } from "./caffeine-input";

type Input = {
  /** Choose day for today, week for the last seven calendar days, or month for the last 30. Defaults to day. */
  range?: HistoryRange;
  /** Return individual drinks if the user wants to see entries. Omit for totals and trends only. */
  includeEntries?: boolean;
  /** When listing entries, pass the previous result's nextOffset to get the next page. */
  offset?: number;
};

export default async function getCaffeineHistory({ range = "day", includeEntries = false, offset = 0 }: Input = {}) {
  if (range !== "day" && range !== "week" && range !== "month") throw new Error("Use day, week, or month.");
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Use a non-negative whole number for the offset.");

  const intakes = await getIntakes();
  const now = new Date();
  const data = historyStats(intakes, range, now);
  const start = getHistoryStart(range, now);
  const summary = {
    range,
    period: data.label,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    totalCaffeineMg: data.total,
    dailyAverageMg: data.dailyAverage,
    drinkCount: data.count,
    breakdown: data.buckets.map(({ label, amount }) => ({ label, caffeineMg: amount })),
    historyUrl: commandUrl("caffeine-history", { range }),
  };
  if (!includeEntries) return summary;

  const pageSize = 30;
  const entries = intakes
    .filter(({ timestamp }) => timestamp >= start && timestamp <= now)
    .sort((a, b) => +b.timestamp - +a.timestamp)
    .slice(offset, offset + pageSize)
    .map(({ timestamp, drinkType, amount, amountDescription }) => ({
      drink: drinkType,
      caffeineMg: amount,
      serving: amountDescription ?? null,
      consumedAt: timestamp.toISOString(),
      localTime: formatDateTime(timestamp),
    }));

  return { ...summary, entries, nextOffset: offset + pageSize < data.count ? offset + pageSize : null };
}
