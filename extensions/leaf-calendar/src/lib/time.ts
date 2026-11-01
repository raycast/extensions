// Times as Leaf Calendar reads and writes them: ISO 8601 with an offset, or yyyy-MM-dd for all-day (end exclusive).

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** A local date as `yyyy-MM-dd`. */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A local time as `yyyy-MM-ddTHH:mm:ss±hh:mm` (Leaf Calendar refuses a time without an offset). */
export function toIsoLocal(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${toDateString(date)}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** A Leaf Calendar time or date as a Date; a date is local midnight, not UTC. */
export function parseLeafTime(text: string): Date {
  const date = DATE_ONLY.exec(text);
  return date ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : new Date(text);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** The next :00 or :30 after `now`. */
export function nextHalfHour(now: Date): Date {
  const result = new Date(now);
  result.setSeconds(0, 0);
  result.setMinutes(result.getMinutes() < 30 ? 30 : 60);
  return result;
}

/**
 * A form's start and end as Leaf Calendar's params. All-day takes the last day included (as a person picks it) and sends the
 * day after as the end, as Leaf Calendar and Google expect.
 *
 * @throws Error when the end isn't after the start.
 */
export function spanToApi(start: Date, end: Date, allDay: boolean): { start: string; end: string } {
  if (allDay) {
    if (startOfDay(end) < startOfDay(start)) {
      throw new Error("The end date can't be before the start date.");
    }

    return { start: toDateString(start), end: toDateString(addDays(startOfDay(end), 1)) };
  }

  if (end <= start) {
    throw new Error("The end must be after the start.");
  }

  return { start: toIsoLocal(start), end: toIsoLocal(end) };
}

/**
 * A start and a length as Leaf Calendar's params: `length` is minutes for a timed event, days for an all-day one.
 *
 * @throws Error when the length isn't a positive whole number.
 */
export function durationToApi(start: Date, length: number, allDay: boolean): { start: string; end: string } {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error("Pick a duration.");
  }

  return allDay
    ? spanToApi(start, addDays(startOfDay(start), length - 1), true)
    : spanToApi(start, addMinutes(start, length), false);
}

/** A length as "30 min", "1 h" or "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest} min`;
  }

  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Each start a `minutes`-long booking fits from inside a time, in steps of that length (as a booking link splits it). */
export function splitStarts(time: { start: string; end: string }, minutes: number): Date[] {
  const end = parseLeafTime(time.end).getTime();
  const starts: Date[] = [];
  for (let at = parseLeafTime(time.start); at.getTime() + minutes * 60_000 <= end; at = addMinutes(at, minutes)) {
    starts.push(at);
  }

  return starts;
}

/**
 * A free stretch as `minutes`-long slots starting on the clock (quarter hours for slots under 30 minutes, half hours
 * otherwise), or the whole stretch for 0.
 */
export function slotsOf(time: { start: string; end: string }, minutes: number): { start: string; end: string }[] {
  if (!minutes) {
    return [time];
  }

  const step = (minutes < 30 ? 15 : 30) * 60_000;
  const first = new Date(Math.ceil(parseLeafTime(time.start).getTime() / step) * step);
  return splitStarts({ start: toIsoLocal(first), end: time.end }, minutes).map((start) => ({
    start: toIsoLocal(start),
    end: toIsoLocal(addMinutes(start, minutes)),
  }));
}

/** The usual meeting lengths, in minutes. */
export const USUAL_DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 480];

/** The usual all-day lengths, in days. */
export const DAY_DURATIONS = [1, 2, 3, 4, 5, 7, 14];

/** A length in days as "1 day", "3 days", "1 week" or "2 weeks". */
export function formatDays(days: number): string {
  if (days % 7 === 0) {
    return days === 7 ? "1 week" : `${days / 7} weeks`;
  }

  return days === 1 ? "1 day" : `${days} days`;
}

/** The usual durations that fit in `maxMinutes`, plus `maxMinutes` itself when it isn't one of them. */
export function durationsUpTo(maxMinutes: number): number[] {
  const fit = USUAL_DURATIONS.filter((minutes) => minutes <= maxMinutes);
  return fit.includes(maxMinutes) ? fit : [...fit, maxMinutes];
}

/** The usual lengths with `current` added in order when it isn't one of them (so an edit can keep it). */
export function withCurrent(lengths: number[], current: number): number[] {
  return lengths.includes(current) ? lengths : [...lengths, current].sort((a, b) => a - b);
}

/** An event's span as a form shows it: all-day ends on the last day included. */
export function spanFromApi(item: { start: string; end: string; allDay: boolean }): { start: Date; end: Date } {
  const start = parseLeafTime(item.start);
  const end = parseLeafTime(item.end);
  return { start, end: item.allDay ? addDays(end, -1) : end };
}

/**
 * Items grouped by local day, in day order. An item that started before `from` (still going) is listed on `from`'s day.
 */
export function groupByDay<T extends { start: string }>(items: T[], from: Date): { day: Date; items: T[] }[] {
  const first = startOfDay(from);
  const groups = new Map<number, { day: Date; items: T[] }>();
  for (const item of items) {
    const start = parseLeafTime(item.start);
    const day = start < first ? first : startOfDay(start);
    const group = groups.get(day.getTime()) ?? { day, items: [] };
    group.items.push(item);
    groups.set(day.getTime(), group);
  }

  return [...groups.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

/** "Today", "Tomorrow", or the weekday and date. */
export function dayTitle(day: Date, now: Date, locale?: string): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diff === 0) {
    return "Today";
  }

  if (diff === 1) {
    return "Tomorrow";
  }

  return day.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
}

export function formatTime(date: Date, locale?: string): string {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

function formatShortDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * When an event happens, as seen from `day`: "All day", "9:00 AM – 10:00 AM", or with dates when it spans days.
 */
export function formatSpan(item: { start: string; end: string; allDay: boolean }, day: Date, locale?: string): string {
  const { start, end } = spanFromApi(item);
  if (item.allDay) {
    return startOfDay(end) > startOfDay(start) ? `All day, until ${formatShortDate(end, locale)}` : "All day";
  }

  const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const from = sameDay(start, day)
    ? formatTime(start, locale)
    : `${formatShortDate(start, locale)} ${formatTime(start, locale)}`;
  const to = sameDay(end, start)
    ? formatTime(end, locale)
    : `${formatShortDate(end, locale)} ${formatTime(end, locale)}`;
  return `${from} – ${to}`;
}
