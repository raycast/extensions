import { MAX_NAME_LENGTH, MAX_NOTES_LENGTH } from "./wire";

// Local-date and label helpers shared by the commands.

/** The reason a name or notes text is over the server limit, or null. */
export function textLimitError(name: string, notes = ""): string | null {
  if (name.length > MAX_NAME_LENGTH) return `Shorten the name to ${MAX_NAME_LENGTH} characters or less.`;
  if (notes.length > MAX_NOTES_LENGTH) return `Shorten the notes to ${MAX_NOTES_LENGTH} characters or less.`;
  return null;
}

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

// A span bound is a local datetime "YYYY-MM-DDTHH:MM": wall-clock time in the
// account timezone, with no offset. Wall arithmetic here ignores DST on purpose.
const LOCAL_DATETIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

/** True when a value is a strict local datetime ("YYYY-MM-DDTHH:MM"). */
export function isLocalDateTime(value: unknown): value is string {
  return typeof value === "string" && LOCAL_DATETIME.test(value);
}

/** The "YYYY-MM-DD" part of a local datetime. */
export function datePart(local: string): string {
  return local.slice(0, 10);
}

/** The "HH:MM" part of a local datetime. */
export function clockPart(local: string): string {
  return local.slice(11, 16);
}

/** The local datetime of a device Date's wall clock. */
export function toLocalDateTime(date: Date): string {
  return `${todayISO(date)}T${clockHM(date)}`;
}

/** A device Date with the wall clock of a local datetime. */
export function localToDate(local: string): Date {
  return combineDateTime(datePart(local), clockPart(local));
}

/** Wall minutes since the epoch, so two local datetimes subtract without DST. */
function wallEpochMinutes(local: string): number {
  const [y, m, d] = datePart(local).split("-").map(Number);
  const [h, min] = clockPart(local).split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, min) / 60000;
}

/** Wall minutes from one local datetime to another, or null on a bad value. */
export function localMinutesBetween(from: string, to: string): number | null {
  if (!isLocalDateTime(from) || !isLocalDateTime(to)) return null;
  return wallEpochMinutes(to) - wallEpochMinutes(from);
}

/** A local datetime moved by wall minutes. */
export function addMinutesLocal(local: string, minutes: number): string {
  const moved = new Date((wallEpochMinutes(local) + minutes) * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}T${pad(moved.getUTCHours())}:${pad(moved.getUTCMinutes())}`;
}

/**
 * "22:00 → 01:30 +1" — "+N" is the days from the start date to the end date. An
 * end at 00:00 on the next day is the day boundary, so it shows as 24:00.
 */
export function formatRange(span: { start: string; end: string }): string {
  const start = clockPart(span.start);
  const end = clockPart(span.end);
  const days = Math.round(
    (localMinutesBetween(`${datePart(span.start)}T00:00`, `${datePart(span.end)}T00:00`) ?? 0) / 1440,
  );
  if (days === 1 && end === "00:00") return `${start} → 24:00`;
  return `${start} → ${end}${days > 0 ? ` +${days}` : ""}`;
}

/** "90m" / "1h" / "1h30". */
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

/**
 * Parse a duration token ("90m", "1h30", "2h", "1.5h") to minutes.
 * Returns the minutes and the matched substring, or null when none is found.
 */
export function parseDuration(text: string): { minutes: number; match: string } | null {
  const hm = /(\d+)\s*h(?:ours?|rs?)?\s*(\d{1,2})\s*(?:m(?:in(?:ute)?s?)?)?\b/i.exec(text); // 1h30, 1 hour 30 minutes
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
