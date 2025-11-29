import { NormalizedTimeEntry } from "../bamboo/api";
import { DayOffInfo } from "./holidays";

export interface DayInfo {
  date: string;
  entries: NormalizedTimeEntry[];
  dayOff?: DayOffInfo;
  hasEntries: boolean;
}

function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getUTCDay(); // Use UTC to avoid timezone issues
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

function isFutureDate(date: Date): boolean {
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const checkDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  return checkDate > todayUTC;
}

export function generateMonthlyCalendar(
  year: number,
  month: number,
  entries: NormalizedTimeEntry[],
  dayOffs: DayOffInfo[],
  includeWeekends: boolean = false,
): Map<string, DayInfo> {
  const calendar = new Map<string, DayInfo>();

  // Generate all dates in the month using UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month, 1));
  while (date.getUTCMonth() === month) {
    const dateString = date.toISOString().split("T")[0];

    // Skip future dates
    if (isFutureDate(date)) {
      date.setUTCDate(date.getUTCDate() + 1);
      continue;
    }

    const dayEntries = entries.filter((entry) => entry.date === dateString);
    const dayOff = dayOffs.find((d) => d.date === dateString);
    const hasEntries = dayEntries.length > 0;
    const isWeekendDay = isWeekend(date);

    // Weekend logic:
    // - Always include weekends if includeWeekends setting is true
    // - Include weekends if they have time entries (even if setting is false)
    // - Skip weekends if there's a day off or holiday (even if setting is true or has entries)
    if (isWeekendDay) {
      if (dayOff) {
        // Skip weekends with day offs/holidays
        date.setUTCDate(date.getUTCDate() + 1);
        continue;
      }

      if (!includeWeekends && !hasEntries) {
        // Skip weekends without entries when setting is off
        date.setUTCDate(date.getUTCDate() + 1);
        continue;
      }
    }

    calendar.set(dateString, {
      date: dateString,
      entries: dayEntries,
      dayOff,
      hasEntries,
    });

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return calendar;
}
