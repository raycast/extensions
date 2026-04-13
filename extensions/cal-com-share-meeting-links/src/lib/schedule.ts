import type { CalSchedule, CalScheduleAvailability, CalScheduleOverride, CalWeekday } from "@api/cal.com";

export const WEEKDAYS: CalWeekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** 00:00, 00:15, ... 23:45, 23:59 — used in all time-slot dropdowns.
 *  23:59 is included as an end-of-day sentinel to match Cal.com's web UI, which allows
 *  ranges that extend to one minute before midnight. */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  slots.push("23:59");
  return slots;
})();

export interface DayRange {
  startTime: string;
  endTime: string;
}

/** Returns all ranges that apply to the given day, preserving schedule order. */
export function rangesForDay(schedule: CalSchedule, day: CalWeekday): DayRange[] {
  return schedule.availability
    .filter((a) => a.days.includes(day))
    .map(({ startTime, endTime }) => ({ startTime, endTime }));
}

/**
 * Returns a new availability array with all ranges for `day` removed, and
 * the provided `ranges` re-inserted as single-day entries for `day`.
 * Existing entries that grouped `day` with other days are split so the
 * other days keep their ranges.
 */
export function withDayHoursReplaced(
  schedule: CalSchedule,
  day: CalWeekday,
  ranges: DayRange[],
): CalScheduleAvailability[] {
  const next: CalScheduleAvailability[] = [];
  for (const entry of schedule.availability) {
    if (!entry.days.includes(day)) {
      next.push(entry);
      continue;
    }
    const otherDays = entry.days.filter((d) => d !== day);
    if (otherDays.length > 0) {
      next.push({ ...entry, days: otherDays });
    }
  }
  for (const r of ranges) {
    next.push({ days: [day], startTime: r.startTime, endTime: r.endTime });
  }
  return next;
}

/**
 * Returns a new overrides array with any override for `override.date`
 * removed, then `override` inserted. Sorted by date ascending.
 */
export function withOverrideUpserted(schedule: CalSchedule, override: CalScheduleOverride): CalScheduleOverride[] {
  const others = schedule.overrides.filter((o) => o.date !== override.date);
  return [...others, override].sort((a, b) => a.date.localeCompare(b.date));
}

/** Returns a new overrides array with the override for `date` removed. */
export function withOverrideRemoved(schedule: CalSchedule, date: string): CalScheduleOverride[] {
  return schedule.overrides.filter((o) => o.date !== date);
}

/** Formats a single range as "09:00 – 17:00". */
export function formatRange(range: DayRange): string {
  return `${range.startTime} – ${range.endTime}`;
}

/** Formats all ranges for a day as a comma-separated list, or "Unavailable" if none. */
export function formatDayRanges(ranges: DayRange[]): string {
  if (ranges.length === 0) return "Unavailable";
  return ranges.map(formatRange).join(", ");
}

/** An override encoded as startTime === endTime is treated as "Unavailable". */
export function isUnavailableOverride(override: CalScheduleOverride): boolean {
  return override.startTime === override.endTime;
}

/** Formats an override's range as "09:00 – 17:00" or "Unavailable". */
export function formatOverrideRange(override: CalScheduleOverride): string {
  return isUnavailableOverride(override) ? "Unavailable" : `${override.startTime} – ${override.endTime}`;
}

/** Formats a YYYY-MM-DD string as "May 15, 2026" (no timezone math — date is calendar-local). */
export function formatOverrideDate(date: string): string {
  const [y, m, d] = date.split("-").map((n) => Number(n));
  const js = new Date(Date.UTC(y, m - 1, d));
  return js.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a YYYY-MM-DD string as the full weekday name (e.g. "Saturday"). */
export function formatOverrideWeekday(date: string): string {
  const [y, m, d] = date.split("-").map((n) => Number(n));
  const js = new Date(Date.UTC(y, m - 1, d));
  return js.toLocaleDateString(undefined, {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** Humanizes an IANA timezone for display, e.g. "America/Los_Angeles" -> "America/Los Angeles". */
export function formatTimeZone(tz: string): string {
  return tz.replace(/_/g, " ");
}

/** Converts a JS Date (from Form.DatePicker, local time) to "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses "YYYY-MM-DD" as a local Date (for Form.DatePicker defaults). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(y, m - 1, d);
}
