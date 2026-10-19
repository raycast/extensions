import type { DayStatus } from "@/types";

export const HISTORY_DAYS = 90;

export interface DaySpan {
  start: Date;
  end: Date;
  level: DayStatus["level"];
}

const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  unknown: 0,
  degraded: 1,
  partial: 2,
  major: 3,
};

export function worseDayLevel(
  a: DayStatus["level"],
  b: DayStatus["level"],
): DayStatus["level"] {
  return DAY_LEVEL_SEVERITY[b] > DAY_LEVEL_SEVERITY[a] ? b : a;
}

function startOfLocalDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Last `days` local days, each at the worst level of any span covering it. */
export function buildDayHistory(
  spans: DaySpan[],
  days = HISTORY_DAYS,
): DayStatus[] {
  const today = startOfLocalDay(new Date());
  const levels = new Map<string, DayStatus["level"]>();

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    levels.set(formatLocalDate(day), "operational");
  }

  for (const span of spans) {
    const cursor = startOfLocalDay(span.start);
    const end = startOfLocalDay(span.end);

    while (cursor <= end) {
      const key = formatLocalDate(cursor);
      const existing = levels.get(key);
      if (existing !== undefined) {
        levels.set(key, worseDayLevel(existing, span.level));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(levels, ([date, level]) => ({ date, level }));
}
