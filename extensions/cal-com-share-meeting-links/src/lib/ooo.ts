import type { CalOOOEntry, CalOOOReason } from "@api/cal.com";

/** Stable order for the reason dropdown. */
export const OOO_REASONS: CalOOOReason[] = ["unspecified", "vacation", "travel", "sick", "public_holiday"];

/** Display label for a reason (Title Case). */
export function labelForReason(reason: CalOOOReason): string {
  switch (reason) {
    case "unspecified":
      return "Unspecified";
    case "vacation":
      return "Vacation";
    case "travel":
      return "Travel";
    case "sick":
      return "Sick";
    case "public_holiday":
      return "Public Holiday";
  }
}

/** Emoji icon for a reason — matches the icons used on cal.com's web UI. */
export function iconForReason(reason: CalOOOReason): { source: string } {
  switch (reason) {
    case "vacation":
      return { source: "🏝️" };
    case "travel":
      return { source: "🛫" };
    case "sick":
      return { source: "🤒" };
    case "public_holiday":
      return { source: "📅" };
    case "unspecified":
      return { source: "🕒" };
  }
}

/**
 * Number of inclusive calendar days between start and end. Treats the API's
 * end-of-day convention (next-day-00:00:00Z) as "ends at midnight on the day
 * BEFORE end". A 1-day OOO returns 1.
 */
export function daysInRange(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((endMs - startMs) / dayMs));
}

/** Last calendar day of an OOO range, given the end timestamp uses next-day-00:00 convention. */
export function lastDay(end: string): Date {
  const d = new Date(end);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

function formatCalendarDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatWeekday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/** "May 1, 2026" or "May 1 – 7, 2026". Single-day collapses. */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = lastDay(end);
  const sameDay =
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCDate() === e.getUTCDate();
  if (sameDay) return formatCalendarDate(s);
  return `${formatCalendarDate(s)} – ${formatCalendarDate(e)}`;
}

/** "Friday" or "Friday – Thursday". */
export function formatWeekdayRange(start: string, end: string): string {
  const s = new Date(start);
  const e = lastDay(end);
  const sameDay =
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCDate() === e.getUTCDate();
  if (sameDay) return formatWeekday(s);
  return `${formatWeekday(s)} – ${formatWeekday(e)}`;
}

/** True when `now` falls within [entry.start, entry.end). */
export function isCurrentlyActive(entry: CalOOOEntry, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(entry.start).getTime() && t < new Date(entry.end).getTime();
}

/**
 * Convert a JS Date (from Form.DatePicker, local time) into the API's UTC
 * "start of day" ISO string. Uses local-time getters so the user sees the
 * date they picked.
 */
export function toUtcStart(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0)).toISOString();
}

/**
 * Convert a JS Date (from Form.DatePicker, local time) into the API's UTC
 * "end of day" ISO string, using the next-day-00:00:00Z convention.
 */
export function toUtcEnd(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)).toISOString();
}

/** Inverse of `toUtcStart` — used for pre-filling Form.DatePicker on edit. */
export function fromUtcStart(iso: string): Date {
  const u = new Date(iso);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

/** Inverse of `toUtcEnd` — returns the OOO's last calendar day in local time. */
export function fromUtcEnd(iso: string): Date {
  const u = lastDay(iso);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}
