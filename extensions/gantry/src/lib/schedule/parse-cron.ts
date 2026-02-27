import type {
  CalendarInterval,
  ScheduleParseResult,
  ParsedSchedule,
} from "../types";
import { computePreview } from "./preview";

function buildIntervals(
  minutes: number[] | null,
  hours: number[] | null,
  days: number[] | null,
  months: number[] | null,
  weekdays: number[] | null,
): CalendarInterval[] {
  const minuteVals = minutes ?? [undefined];
  const hourVals = hours ?? [undefined];
  const dayVals = days ?? [undefined];
  const monthVals = months ?? [undefined];
  const weekdayVals = weekdays ?? [undefined];

  const intervals: CalendarInterval[] = [];

  for (const month of monthVals) {
    for (const day of dayVals) {
      for (const weekday of weekdayVals) {
        for (const hour of hourVals) {
          for (const minute of minuteVals) {
            const interval: CalendarInterval = {};
            if (month !== undefined) interval.Month = month;
            if (day !== undefined) interval.Day = day;
            if (weekday !== undefined) interval.Weekday = weekday;
            if (hour !== undefined) interval.Hour = hour;
            if (minute !== undefined) interval.Minute = minute;
            intervals.push(interval);
          }
        }
      }
    }
  }

  return intervals;
}

const PARSE_ERROR = Symbol("PARSE_ERROR");

function parseFieldChecked(
  field: string,
  min: number,
  max: number,
): number[] | null | typeof PARSE_ERROR {
  if (field === "*") return null;

  const stepMatch = field.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1]!, 10);
    if (step <= 0 || step > max) return PARSE_ERROR;
    const values: number[] = [];
    for (let i = min; i <= max; i += step) values.push(i);
    return values;
  }

  if (field.includes(",")) {
    const parts = field.split(",");
    const values: number[] = [];
    for (const part of parts) {
      const sub = parseFieldChecked(part.trim(), min, max);
      if (sub === PARSE_ERROR || sub === null) return PARSE_ERROR;
      values.push(...sub);
    }
    return [...new Set(values)].sort((a, b) => a - b);
  }

  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]!, 10);
    const end = parseInt(rangeMatch[2]!, 10);
    if (start < min || end > max || start > end) return PARSE_ERROR;
    const values: number[] = [];
    for (let i = start; i <= end; i++) values.push(i);
    return values;
  }

  const num = parseInt(field, 10);
  if (isNaN(num) || num < min || num > max) return PARSE_ERROR;
  return [num];
}

export function parseCronSchedule(input: string): ScheduleParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a cron expression" };
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return { ok: false, error: "Expected 5 fields: minute hour dom month dow" };
  }

  const [minField, hourField, domField, monthField, dowField] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];

  const minutes = parseFieldChecked(minField, 0, 59);
  if (minutes === PARSE_ERROR)
    return { ok: false, error: "Invalid minute field" };

  const hours = parseFieldChecked(hourField, 0, 23);
  if (hours === PARSE_ERROR) return { ok: false, error: "Invalid hour field" };

  const days = parseFieldChecked(domField, 1, 31);
  if (days === PARSE_ERROR)
    return { ok: false, error: "Invalid day-of-month field" };

  const months = parseFieldChecked(monthField, 1, 12);
  if (months === PARSE_ERROR)
    return { ok: false, error: "Invalid month field" };

  const weekdays = parseFieldChecked(dowField, 0, 7);
  if (weekdays === PARSE_ERROR)
    return { ok: false, error: "Invalid day-of-week field" };

  if (
    minField.startsWith("*/") &&
    hourField === "*" &&
    domField === "*" &&
    monthField === "*" &&
    dowField === "*"
  ) {
    const step = parseInt(minField.slice(2), 10);
    if (step > 0) {
      const schedule: ParsedSchedule = {
        type: "interval",
        startInterval: step * 60,
      };
      const preview = computePreview(schedule);
      return { ok: true, schedule, ...preview };
    }
  }

  const normalizedWeekdays = weekdays?.map((w) => (w === 7 ? 0 : w));
  const uniqueWeekdays = normalizedWeekdays
    ? [...new Set(normalizedWeekdays)].sort((a, b) => a - b)
    : null;

  const intervals = buildIntervals(
    minutes,
    hours,
    days,
    months,
    uniqueWeekdays,
  );

  if (intervals.length === 0) {
    return { ok: false, error: "No valid schedule produced" };
  }

  if (intervals.length > 500) {
    return {
      ok: false,
      error: "Schedule too complex (too many interval combinations)",
    };
  }

  const schedule: ParsedSchedule = {
    type: "calendar",
    calendarIntervals: intervals,
  };
  const preview = computePreview(schedule);
  return { ok: true, schedule, ...preview };
}
