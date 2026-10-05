import type { CalendarRecurrence } from "./apple-calendar";
import type { ParsedBatchItem } from "./parse-korean-schedule-batch";
import type { ParsedSchedule } from "./parse-korean-schedule";

export type RecurrenceEndType = "count" | "until";

export interface RecurrenceSubmitValues {
  recurrenceEndType: RecurrenceEndType;
  recurrenceCount: string;
  recurrenceUntil: Date | null;
}

export interface RecurrenceDateWindow {
  min: Date;
  max: Date;
}

export interface PreparedCalendarSubmissionItem {
  item: ParsedBatchItem;
  parsed: ParsedSchedule;
  recurrence?: CalendarRecurrence;
}

export const MAX_RECURRENCE_COUNT = 50;

export function buildRecurrenceForSubmit(
  parsed: ParsedSchedule,
  values: RecurrenceSubmitValues,
): CalendarRecurrence | undefined | Error {
  const recurrence = parsed.recurrence;
  if (!recurrence) {
    return undefined;
  }

  if (values.recurrenceEndType === "count") {
    const normalizedCount = values.recurrenceCount.trim();
    const count = Number.parseInt(normalizedCount, 10);
    if (!/^\d+$/u.test(normalizedCount) || count < 1 || count > MAX_RECURRENCE_COUNT) {
      return new Error(`Recurrence count must be between 1 and ${MAX_RECURRENCE_COUNT}.`);
    }
    return {
      ...recurrence,
      interval: 1,
      end: {
        type: "count",
        count,
      },
    };
  }

  if (!values.recurrenceUntil || Number.isNaN(values.recurrenceUntil.getTime())) {
    return new Error("Select a recurrence end date.");
  }

  const until = alignDateToScheduleTime(values.recurrenceUntil, parsed.start);
  if (until.getTime() < parsed.start.getTime()) {
    return new Error("Recurrence end date must be on or after the start date.");
  }

  const oneYearAfterStart = addYearsClamped(parsed.start, 1);
  if (until.getTime() > oneYearAfterStart.getTime()) {
    return new Error("Recurrence end date must be within 1 year of the start date.");
  }

  return {
    ...recurrence,
    interval: 1,
    end: {
      type: "until",
      untilEpochMs: until.getTime(),
    },
  };
}

export function prepareCalendarBatchForSubmit(
  items: ParsedBatchItem[],
  values: RecurrenceSubmitValues,
  manualLocation?: string,
): PreparedCalendarSubmissionItem[] | Error {
  const location = manualLocation?.trim();
  const prepared: PreparedCalendarSubmissionItem[] = [];

  for (const item of items) {
    const parsed = {
      ...item.value,
      location: location || item.value.location,
    };
    const recurrence = buildRecurrenceForSubmit(parsed, values);
    if (recurrence instanceof Error) {
      return recurrence;
    }
    prepared.push({ item, parsed, recurrence });
  }

  return prepared;
}

export function getRecurrenceDateWindow(items: ParsedBatchItem[]): RecurrenceDateWindow | undefined {
  const starts = items.filter((item) => item.value.recurrence).map((item) => item.value.start);
  if (starts.length === 0) {
    return undefined;
  }

  const min = new Date(Math.max(...starts.map((date) => startOfDay(date).getTime())));
  const max = new Date(Math.min(...starts.map((date) => startOfDay(addYearsClamped(date, 1)).getTime())));
  return { min, max };
}

export function defaultRecurrenceUntil(from: Date = new Date(), max?: Date): Date {
  const candidate = addMonthsClamped(startOfDay(from), 3);
  if (max && candidate.getTime() > startOfDay(max).getTime()) {
    return startOfDay(max);
  }
  return candidate;
}

function alignDateToScheduleTime(date: Date, scheduleStart: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    scheduleStart.getHours(),
    scheduleStart.getMinutes(),
    scheduleStart.getSeconds(),
    scheduleStart.getMilliseconds(),
  );
}

function addMonthsClamped(date: Date, months: number): Date {
  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate();
  return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(date.getDate(), lastDay));
}

function addYearsClamped(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years;
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(
    targetYear,
    date.getMonth(),
    Math.min(date.getDate(), lastDay),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
