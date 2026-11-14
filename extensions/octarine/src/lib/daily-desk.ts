import path from "node:path";
import { normalizeText } from "@lib/utils";

/** Directory that contains Daily Desk notes in an Octarine workspace. */
export const DAILY_DIRECTORY_NAME = "Daily";

/**
 * Normalized date input used to match Daily Desk file names.
 *
 * A query stores a full date, an ISO week, or a month and day without a year.
 */
export type DateQuery =
  { kind: "date"; iso: string } | { kind: "week"; week: string } | { kind: "month-day"; month: number; day: number };

/** Date data parsed from a Daily Desk file name. */
export type FilenameDate = { kind: "date"; iso: string } | { kind: "week"; week: string };

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NUMBERS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_WEEK_PATTERN = /^(\d{4})-w(\d{2})$/i;
const MONTH_DAY_PATTERN = /^([a-z]+) (\d{1,2})$/;
const MONTH_DAY_YEAR_PATTERN = /^([a-z]+) (\d{1,2}),? (\d{4})$/;
const DAY_MONTH_PATTERN = /^(\d{1,2}) ([a-z]+)$/;
const DAY_MONTH_YEAR_PATTERN = /^(\d{1,2}) ([a-z]+),? (\d{4})$/;
const RELATIVE_DAYS_PATTERN = /^(\d+) (day|days|week|weeks) ago$/;
const RELATIVE_IN_PATTERN = /^in (\d+) (day|days|week|weeks)$/;
const RELATIVE_WEEKDAY_PATTERN = /^(next|last) (sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/;
const RELATIVE_WEEK_PATTERN = /^(this|last|next) week$/;
const LEAP_YEAR = 2024;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves a command date argument into the canonical Daily note stem.
 * Returns an empty string when no date was provided and null for an invalid date.
 */
export function resolveDateArg(value?: string, now: Date = new Date()): string | null {
  const input = value?.trim() ?? "";
  if (!input) {
    return "";
  }

  const dateQuery = resolveDateQuery(input, now);
  return dateQuery ? toDailyStem(dateQuery, now) : null;
}

/**
 * Resolves a supported date expression into a comparable query.
 *
 * @param value Date expression such as `2024-01-15`, `today`, `2 days ago` or `jan 15`.
 * @param now Reference date used to resolve relative expressions.
 *
 * @remarks
 * The parser accepts ISO dates and weeks, relative dates and weeks, weekday expressions,
 * and named dates in month-day or day-month order.
 */
export function resolveDateQuery(value: string, now: Date = new Date()): DateQuery | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return parseIsoQuery(normalized) ?? parseRelativeQuery(normalized, now) ?? parseNamedDateQuery(normalized);
}

/**
 * Returns the Daily Desk filename stem for a note path.
 *
 * @param notePath Note path such as `Daily/2023-02-18.md`.
 */
export function dailyNoteStem(notePath: string): string {
  return path.posix.basename(notePath, ".md");
}

/**
 * Parses the date encoded in a Daily Desk filename.
 *
 * @param filename File name such as `2023-02-18.md` or `2026-W03.md`.
 */
export function parseFilenameDate(filename: string): FilenameDate | null {
  const stem = dailyNoteStem(filename);

  if (parseIsoDate(stem)) {
    return { kind: "date", iso: stem };
  }

  const week = parseIsoWeek(stem);
  if (week) {
    return { kind: "week", week: formatWeekNumber(week.year, week.week) };
  }

  return null;
}

/**
 * Checks whether a note filename matches a resolved date expression.
 *
 * @param query Resolved date expression.
 * @param filename Note filename to compare against.
 *
 * @remarks
 * A month-day query matches the same month and day in any year. A full date query also
 * matches the ISO week file that contains that date. A week query matches its weekly file
 * and daily files in that week.
 */
export function matchesDateQuery(query: DateQuery, filename: string): boolean {
  const file = parseFilenameDate(filename);
  if (!file) {
    return false;
  }

  if (query.kind === "month-day") {
    if (file.kind !== "date") {
      return false;
    }
    const date = parseIsoDate(file.iso);
    return date ? date.getMonth() + 1 === query.month && date.getDate() === query.day : false;
  }

  if (query.kind === "date") {
    if (file.kind === "date") {
      return file.iso === query.iso;
    }
    const date = parseIsoDate(query.iso);
    return date ? isoWeekString(date) === file.week : false;
  }

  if (file.kind === "week") {
    return file.week === query.week;
  }

  const date = parseIsoDate(file.iso);
  return date ? isoWeekString(date) === query.week : false;
}

/**
 * Converts a resolved date expression into a Daily note filename stem.
 *
 * Month-day expressions use the current year; day 29 of February clamps to the last day of the month.
 *
 * @param query Resolved date expression.
 * @param now Reference date used to resolve month-day expressions.
 */
export function toDailyStem(query: DateQuery, now: Date = new Date()): string {
  if (query.kind === "date") {
    return query.iso;
  }

  if (query.kind === "week") {
    return query.week;
  }

  const year = now.getFullYear();
  const day = Math.min(query.day, daysInMonth(year, query.month));
  return `${year}-${pad2(query.month)}-${pad2(day)}`;
}

/**
 * Formats an ISO date as a display label.
 *
 * @param iso ISO date such as `2023-02-18`.
 */
export function formatDateLabel(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) {
    return iso;
  }

  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Formats an ISO week as a natural language label.
 *
 * @param week ISO week such as `2026-W03`.
 */
export function formatWeekLabel(week: string): string {
  const parsed = parseIsoWeek(week);
  if (!parsed) {
    return week;
  }

  return `Week ${parsed.week}, ${parsed.year}`;
}

/**
 * Returns a sortable timestamp for a Daily note filename. Weekly notes use the Monday of their week.
 *
 * @param filename File name such as `2023-02-18.md` or `2026-W03.md`.
 */
export function dailyTimestamp(filename: string): number | null {
  const parsed: FilenameDate | null = parseFilenameDate(filename);
  if (!parsed) {
    return null;
  }

  if (parsed.kind === "date") {
    const date = parseIsoDate(parsed.iso);
    return date ? date.getTime() : null;
  }

  return isoWeekMonday(parsed.week)?.getTime() ?? null;
}

/**
 * Returns the ISO week string for a date.
 *
 * @param date Date to convert.
 */
function isoWeekString(date: Date): string {
  const { year, week } = isoWeekParts(date);
  return formatWeekNumber(year, week);
}

function buildMonthDayQuery(monthName: string, dayText: string): DateQuery | null {
  const month = MONTH_NUMBERS[monthName];
  const day = Number(dayText);
  if (!month || !isValidMonthDay(month, day)) {
    return null;
  }

  return { kind: "month-day", month, day };
}

function buildDateQuery(yearText: string, monthName: string, dayText: string): DateQuery | null {
  const year = Number(yearText);
  const month = MONTH_NUMBERS[monthName];
  const day = Number(dayText);
  if (!month || !isValidDateParts(year, month, day)) {
    return null;
  }

  return { kind: "date", iso: `${year}-${pad2(month)}-${pad2(day)}` };
}

function toDays(amountText: string, unit: string): number {
  const amount = Number(amountText);
  return unit.startsWith("week") ? amount * 7 : amount;
}

function weekdayOffset(target: number, current: number, direction: 1 | -1): number {
  const difference = direction === 1 ? (target - current + 7) % 7 : -((current - target + 7) % 7);
  return difference === 0 ? direction * 7 : difference;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDate(value: string): Date | null {
  const match = value.match(ISO_DATE_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function parseIsoWeek(value: string): { year: number; week: number } | null {
  const match = value.match(ISO_WEEK_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > weeksInYear(year)) {
    return null;
  }

  return { year, week };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return false;
  }

  return true;
}

function isValidMonthDay(month: number, day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= daysInMonth(LEAP_YEAR, month);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function weeksInYear(year: number): number {
  return isoWeekParts(new Date(year, 11, 28)).week;
}

function isoWeekParts(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const year = target.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((target.getTime() - yearStart) / MILLISECONDS_PER_DAY + 1) / 7);
  return { year, week };
}

function isoWeekMonday(week: string): Date | null {
  const parsed = parseIsoWeek(week);
  if (!parsed) {
    return null;
  }

  const januaryFourth = new Date(parsed.year, 0, 4);
  const dayNumber = januaryFourth.getDay() || 7;
  return new Date(parsed.year, 0, 4 - (dayNumber - 1) + (parsed.week - 1) * 7);
}

function parseIsoQuery(value: string): DateQuery | null {
  if (parseIsoDate(value)) {
    return { kind: "date", iso: value };
  }

  const week = parseIsoWeek(value);
  return week ? { kind: "week", week: formatWeekNumber(week.year, week.week) } : null;
}

function parseRelativeQuery(value: string, now: Date): DateQuery | null {
  if (value === "today") {
    return { kind: "date", iso: toIsoDate(now) };
  }
  if (value === "yesterday") {
    return { kind: "date", iso: toIsoDate(addDays(now, -1)) };
  }
  if (value === "tomorrow") {
    return { kind: "date", iso: toIsoDate(addDays(now, 1)) };
  }

  const relativeDays = value.match(RELATIVE_DAYS_PATTERN);
  if (relativeDays) {
    return { kind: "date", iso: toIsoDate(addDays(now, -toDays(relativeDays[1], relativeDays[2]))) };
  }

  const relativeIn = value.match(RELATIVE_IN_PATTERN);
  if (relativeIn) {
    return { kind: "date", iso: toIsoDate(addDays(now, toDays(relativeIn[1], relativeIn[2]))) };
  }

  const relativeWeekday = value.match(RELATIVE_WEEKDAY_PATTERN);
  if (relativeWeekday) {
    const target = WEEKDAY_NUMBERS[relativeWeekday[2]];
    const direction = relativeWeekday[1] === "next" ? 1 : -1;
    return { kind: "date", iso: toIsoDate(addDays(now, weekdayOffset(target, now.getDay(), direction))) };
  }

  const relativeWeek = value.match(RELATIVE_WEEK_PATTERN);
  if (relativeWeek) {
    const shift = relativeWeek[1] === "last" ? -7 : relativeWeek[1] === "next" ? 7 : 0;
    return { kind: "week", week: isoWeekString(addDays(now, shift)) };
  }

  return null;
}

function parseNamedDateQuery(value: string): DateQuery | null {
  const monthDay = value.match(MONTH_DAY_PATTERN);
  if (monthDay) {
    return buildMonthDayQuery(monthDay[1], monthDay[2]);
  }

  const monthDayYear = value.match(MONTH_DAY_YEAR_PATTERN);
  if (monthDayYear) {
    return buildDateQuery(monthDayYear[3], monthDayYear[1], monthDayYear[2]);
  }

  const dayMonth = value.match(DAY_MONTH_PATTERN);
  if (dayMonth) {
    return buildMonthDayQuery(dayMonth[2], dayMonth[1]);
  }

  const dayMonthYear = value.match(DAY_MONTH_YEAR_PATTERN);
  return dayMonthYear ? buildDateQuery(dayMonthYear[3], dayMonthYear[2], dayMonthYear[1]) : null;
}

function formatWeekNumber(year: number, week: number): string {
  return `${year}-W${pad2(week)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
