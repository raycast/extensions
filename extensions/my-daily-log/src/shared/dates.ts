// All dates in the extension are handled in the user's local timezone.
// Previous versions used `toISOString()` (UTC) to name the log files, which made logs
// land on the wrong day depending on the timezone and time of the day.

const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Local `YYYY-MM-DD` representation of a date, used for file names. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` string as a local date (at midnight). */
export function parseDateKey(key: string): Date | undefined {
  const match = key.match(DATE_KEY_REGEX);
  if (!match) {
    return undefined;
  }
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

export function isDateKey(value: string): boolean {
  return parseDateKey(value) !== undefined;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Monday of the week the date belongs to. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const daysSinceMonday = (day.getDay() + 6) % 7;
  return addDays(day, -daysSinceMonday);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Every day between `from` and `to`, both included. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let day = startOfDay(from); day.getTime() <= startOfDay(to).getTime(); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** Zero padded time using the user's locale, e.g. `09:05` or `9:05 AM`. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** `Today`, `Yesterday` or the full date. */
export function formatRelativeDay(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isSameDay(date, addDays(new Date(), -1))) {
    return "Yesterday";
  }
  return formatLongDate(date);
}

/** Human readable duration, e.g. `45 min` or `2 h 10 min`. */
export function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** Parses `HH:MM` into minutes since midnight. */
export function parseTimeOfDay(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 24 || minutes > 59) {
    return undefined;
  }
  return hours * 60 + minutes;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type ParsedDateArgument = { date: Date; error?: string };

/**
 * Parses the date argument of the "My Daily Log" command.
 * Supports: empty / `t` / `today`, `y` / `yesterday`, a number of days ago (`3`),
 * a weekday name (`friday`, `fri`: the most recent one before today) and `YYYY-MM-DD`.
 */
export function parseDateArgument(input: string | undefined): ParsedDateArgument {
  const value = (input ?? "").trim().toLowerCase();
  const today = startOfDay(new Date());

  if (value === "" || value === "t" || value === "today") {
    return { date: today };
  }
  if (value === "y" || value === "yesterday") {
    return { date: addDays(today, -1) };
  }
  if (/^\d{1,4}$/.test(value)) {
    return { date: addDays(today, -Number(value)) };
  }
  const weekdayIndex = value.length >= 2 ? WEEKDAYS.findIndex((weekday) => weekday.startsWith(value)) : -1;
  if (weekdayIndex >= 0) {
    const daysAgo = (today.getDay() - weekdayIndex + 7) % 7 || 7;
    return { date: addDays(today, -daysAgo) };
  }
  const parsed = parseDateKey(value);
  if (parsed) {
    return { date: parsed };
  }
  return {
    date: today,
    error: `"${input}" is not a valid date. Use t, y, a number of days ago, a weekday or YYYY-MM-DD`,
  };
}
