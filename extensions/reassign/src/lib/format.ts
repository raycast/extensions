import type { ScheduleEvent } from "./schedule-model";

// Local-date and label helpers shared by the commands.

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(base = new Date()): string {
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when a string is a YYYY-MM-DD calendar date. */
export function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Parse an ISO date (YYYY-MM-DD) to a local Date. */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Shift an ISO date (YYYY-MM-DD) by whole days. */
export function addDaysISO(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

/** A friendly weekday label for a date, or "Today"/"Tomorrow" when close. */
export function relativeDayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";
  if (iso === addDaysISO(todayIso, 1)) return "Tomorrow";
  if (iso === addDaysISO(todayIso, -1)) return "Yesterday";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/** "22:00 → 01:30 +1" — a +1 marks a block that ends the next day. */
export function formatRange(event: ScheduleEvent): string {
  const plusDay = event.endNextDay || event.crossesMidnight ? " +1" : "";
  return `${event.start} → ${event.end}${plusDay}`;
}

/** "90m" / "1h" / "1h30". */
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

/** Human duration from a decimal-hour value (for example `durationHours`). */
export function humanHours(hours: number): string {
  return humanDuration(Math.round(hours * 60));
}

/**
 * Parse a duration token ("90m", "1h30", "2h", "1.5h") to minutes.
 * Returns the minutes and the matched substring, or null when none is found.
 */
export function parseDuration(text: string): { minutes: number; match: string } | null {
  const hm = /(\d+)\s*h\s*(\d{2})\s*m?\b/i.exec(text); // 1h30, 1h30m
  if (hm) return { minutes: Number(hm[1]) * 60 + Number(hm[2]), match: hm[0] };
  const hours = /(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/i.exec(text); // 2h, 1.5h
  if (hours) return { minutes: Math.round(Number(hours[1]) * 60), match: hours[0] };
  const mins = /(\d+)\s*m(?:in(?:ute)?s?)?\b/i.exec(text); // 45m, 90 min
  if (mins) return { minutes: Number(mins[1]), match: mins[0] };
  return null;
}

/** The "HH:MM" clock of a local Date. */
export function clockHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Combine an ISO date (YYYY-MM-DD) and an "HH:MM" clock into one local Date. */
export function combineDateTime(dateISO: string, hm: string): Date {
  const date = isoToDate(dateISO);
  const [h, m] = hm.split(":").map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

/** Add minutes to an "HH:MM" clock, wrapping at 24h. */
export function addMinutesHM(hm: string, minutes: number): string {
  const [h, m] = hm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
