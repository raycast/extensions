import { DateTime } from "luxon";

export function startOfWeek(date: Date): Date {
  const dateTime = DateTime.fromJSDate(date);
  return dateTime
    .minus({ days: dateTime.weekday - 1 })
    .startOf("day")
    .toJSDate();
}

export function addDays(date: Date, days: number): Date {
  return DateTime.fromJSDate(date).plus({ days }).toJSDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return DateTime.fromJSDate(a).hasSame(DateTime.fromJSDate(b), "day");
}

export function getCurrentMonthWindow(monthOffset = 0): { start: Date; end: Date } {
  const now = DateTime.now().plus({ months: monthOffset });
  return {
    start: now.startOf("month").toJSDate(),
    end: now.endOf("month").toJSDate(),
  };
}

export function getCurrentWeekDays(date?: Date): Date[] {
  const dateTime = date ? DateTime.fromJSDate(date) : DateTime.now();
  const monday = dateTime.minus({ days: dateTime.weekday - 1 }).startOf("day");
  return Array.from({ length: 7 }, (_, i) => monday.plus({ days: i }).toJSDate());
}

export function isDateInInterval(date: Date, start: Date, end: Date): boolean {
  const dateTime = DateTime.fromJSDate(date);
  return dateTime >= DateTime.fromJSDate(start) && dateTime < DateTime.fromJSDate(end);
}
