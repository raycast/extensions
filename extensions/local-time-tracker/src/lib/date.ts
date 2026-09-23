import type { ReportPeriod } from "./types";

export type DateRange = {
  start: Date;
  end: Date;
};

export function getStartOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getStartOfWeek(now: Date): Date {
  const start = getStartOfToday(now);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function getStartOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getDateRange(period: ReportPeriod, now: Date = new Date()): DateRange {
  const start =
    period === "today" ? getStartOfToday(now) : period === "week" ? getStartOfWeek(now) : getStartOfMonth(now);

  return { start, end: now };
}

export function getOverlapDurationSeconds(
  startedAt: string | Date,
  endedAt: string | Date,
  periodStart: string | Date,
  periodEnd: string | Date,
): number {
  const logStartMs = toMilliseconds(startedAt);
  const logEndMs = toMilliseconds(endedAt);
  const periodStartMs = toMilliseconds(periodStart);
  const periodEndMs = toMilliseconds(periodEnd);

  if (logEndMs < logStartMs || periodEndMs < periodStartMs) {
    throw new Error("Invalid date range");
  }

  const overlapStart = Math.max(logStartMs, periodStartMs);
  const overlapEnd = Math.min(logEndMs, periodEndMs);
  return Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));
}

export function formatLogDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toMilliseconds(value: string | Date): number {
  const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new Error("Invalid date");
  }
  return milliseconds;
}
