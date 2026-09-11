import { DateTime } from "luxon";
import { rangeOf } from "@/common/utils/collection-utils";

export type Week = Date[];
export type TimeWindow = { start: Date; end: Date };
export type YearMonth = { year: number; month: number };
export type YearWeek = `${number}-W${string}`;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function today(): Date {
  return DateTime.now().toJSDate();
}

export function startOfWeek(date: Date): Date {
  const dateTime = DateTime.fromJSDate(date);

  return dateTime
    .minus({ days: dateTime.weekday - 1 })
    .startOf("day")
    .toJSDate();
}

export function startOfDay(date: Date): Date {
  return DateTime.fromJSDate(date).startOf("day").toJSDate();
}

export function endOfDay(date: Date): Date {
  return DateTime.fromJSDate(date).endOf("day").toJSDate();
}

export function addDays(date: Date, days: number): Date {
  return DateTime.fromJSDate(date).plus({ days }).toJSDate();
}

export function weeksBetween(startDate: Date, endDate: Date): number {
  return DateTime.fromJSDate(endDate).diff(DateTime.fromJSDate(startDate), "weeks").weeks;
}

export function isToday(date: Date): boolean {
  return isSameDay(date, today());
}

export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getCurrentMonthWindow(monthOffset = 0): TimeWindow {
  const now = DateTime.now().plus({ months: monthOffset });

  return {
    start: now.startOf("month").toJSDate(),
    end: now.endOf("month").toJSDate(),
  };
}

export function getCurrentWeekWindow(weekOffset = 0): TimeWindow {
  const now = DateTime.now().plus({ weeks: weekOffset });
  const monday = now.minus({ days: now.weekday - 1 }).startOf("day");

  return {
    start: monday.toJSDate(),
    end: monday.plus({ days: 6 }).endOf("day").toJSDate(),
  };
}

export function getCurrentWeekDays(date?: Date): Date[] {
  const dateTime = date ? DateTime.fromJSDate(date) : DateTime.now();
  const monday = dateTime.minus({ days: dateTime.weekday - 1 }).startOf("day");

  return rangeOf(7).map((dayIndex) => monday.plus({ days: dayIndex }).toJSDate());
}

export function fractionOfDayElapsed(date: Date): number {
  const startOfDayMs = DateTime.fromJSDate(date).startOf("day").toMillis();
  return (date.getTime() - startOfDayMs) / DAY_MS;
}

export function isDateInInterval(date: Date, start: Date, end: Date): boolean {
  const dateTime = DateTime.fromJSDate(date);

  return dateTime >= DateTime.fromJSDate(start) && dateTime < DateTime.fromJSDate(end);
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function formatMonth({ year, month }: YearMonth): string {
  return DateTime.fromObject({ year: year, month: month + 1 }).toFormat("MMMM yyyy");
}

export function toYearMonth(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth()).padStart(2, "0")}`;
}

export function toYearWeek(date: Date): YearWeek {
  const dateTime = DateTime.fromJSDate(date);
  const paddedWeekNumber = String(dateTime.weekNumber).padStart(2, "0");

  return `${dateTime.weekYear}-W${paddedWeekNumber}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return DateTime.fromJSDate(a).hasSame(DateTime.fromJSDate(b), "day");
}
