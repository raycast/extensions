import type { CaffeineIntake } from "../types";

export type HistoryRange = "day" | "week" | "month";

const dayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const rangeDays = { day: 1, week: 7, month: 30 };

export function getHistoryStart(range: HistoryRange, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - rangeDays[range] + 1);
  return start;
}

export function historyStats(intakes: readonly CaffeineIntake[], range: HistoryRange, now = new Date()) {
  const days = rangeDays[range];
  const start = getHistoryStart(range, now);

  const buckets = Array.from({ length: range === "day" ? 24 : days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const label = range === "day" ? `${String(index).padStart(2, "0")}:00` : dayLabel.format(date);
    return { label, amount: 0 };
  });

  // Compare calendar dates in UTC so a local day with a clock change still gets one bucket.
  const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  const firstDay = utcDay(start);
  let count = 0;
  let total = 0;
  for (const intake of intakes) {
    const { timestamp, amount } = intake;
    if (timestamp < start || timestamp > now) continue;
    const index = range === "day" ? timestamp.getHours() : utcDay(timestamp) - firstDay;
    buckets[index].amount += amount;
    count++;
    total += amount;
  }

  const label = range === "day" ? dayLabel.format(now) : `${dayLabel.format(start)} – ${dayLabel.format(now)}`;
  return { label, buckets, count, total, dailyAverage: total / days };
}
