/** Trakt caps a calendar at 33 UTC days; one goes to covering the local window's offset. */
export const MAX_CALENDAR_DAYS = 32;
export const DEFAULT_CALENDAR_DAYS = 7;
export const DEFAULT_CALENDAR_LIMIT = 50;
export const MAX_CALENDAR_LIMIT = 200;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarType = "all" | "shows" | "movies";

/** A window of local calendar days, both ends inclusive, as `YYYY-MM-DD` in `timeZone`. */
export type CalendarWindow = { startDate: string; endDate: string; days: number; timeZone: string };

export const EPISODES_FAILED_WARNING =
  "Episodes could not be loaded from Trakt; only movies are listed. Do not conclude that no episodes air in this period.";
export const MOVIES_FAILED_WARNING =
  "Movies could not be loaded from Trakt; only episodes are listed. Do not conclude that no movies come out in this period.";

function localParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

function utcMidnight(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: string, days: number) {
  return new Date(utcMidnight(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (positive east of Greenwich). */
function offsetAt(instant: number, timeZone: string) {
  const { date, time } = localParts(instant, timeZone);
  const [hour, minute] = time.split(":").map(Number);
  const wallClock = utcMidnight(date) + (hour * 60 + minute) * 60 * 1000;
  return wallClock - Math.floor(instant / 60000) * 60000;
}

/** The UTC instant at which `date` starts in `timeZone`. Two passes settle a midnight next to a DST change. */
function localMidnight(date: string, timeZone: string) {
  const wallClock = utcMidnight(date);
  const firstGuess = wallClock - offsetAt(wallClock, timeZone);
  return wallClock - offsetAt(firstGuess, timeZone);
}

/** Today's date in `timeZone`. */
export function localToday(timeZone: string, now = Date.now()) {
  return localParts(now, timeZone).date;
}

/**
 * `startDate` as given by the caller, or today in `timeZone` when it is omitted. Anything else but a real
 * `YYYY-MM-DD` date throws, an empty or blank value included.
 */
export function parseStartDate(input: string | undefined, timeZone: string, now = Date.now()) {
  if (input === undefined) return localToday(timeZone, now);

  const trimmed = input.trim();
  if (!DATE_PATTERN.test(trimmed)) {
    throw new Error(`startDate must be a date in YYYY-MM-DD format, got "${input}".`);
  }
  if (new Date(utcMidnight(trimmed)).toISOString().slice(0, 10) !== trimmed) {
    throw new Error(`startDate is not a real calendar date: "${input}".`);
  }

  return trimmed;
}

/** Number of local days to cover: 7 by default, capped at 32. Anything but a whole number of at least 1 throws. */
export function resolveDays(input: number | undefined) {
  if (input === undefined) return { days: DEFAULT_CALENDAR_DAYS, capped: false };

  if (!Number.isInteger(input) || input < 1) {
    throw new Error(`days must be a whole number of at least 1, got ${input}.`);
  }

  return input > MAX_CALENDAR_DAYS ? { days: MAX_CALENDAR_DAYS, capped: true } : { days: input, capped: false };
}

/** Maximum entries per list: 50 by default, capped at 200. Anything but a whole number of at least 1 throws. */
export function resolveLimit(input: number | undefined) {
  if (input === undefined) return { limit: DEFAULT_CALENDAR_LIMIT, capped: false };

  if (!Number.isInteger(input) || input < 1) {
    throw new Error(`limit must be a whole number of at least 1, got ${input}.`);
  }

  return input > MAX_CALENDAR_LIMIT ? { limit: MAX_CALENDAR_LIMIT, capped: true } : { limit: input, capped: false };
}

/**
 * Keeps the first `limit` entries of a list already filtered and sorted chronologically. `lastDate` is the local
 * date of the last entry kept, so a cut list can say where it stops instead of looking like nothing comes after.
 */
export function truncateList<T>(items: T[], limit: number, dateOf: (item: T) => string) {
  const kept = items.slice(0, limit);
  const truncated = items.length > kept.length;

  return {
    items: kept,
    total: items.length,
    truncated,
    lastDate: truncated && kept.length > 0 ? dateOf(kept[kept.length - 1]) : undefined,
  };
}

/** "episodes truncated at 2026-10-23 (50 of 158)." for a cut list, `undefined` otherwise. */
export function truncationNote(label: string, list: ReturnType<typeof truncateList>) {
  return list.truncated ? `${label} truncated at ${list.lastDate} (${list.items.length} of ${list.total}).` : undefined;
}

/**
 * Days from `localDate` through the coming Sunday, both included: the rest of the calendar week
 * (Monday 7, Wednesday 5, Sunday 1). Weeks end on Sunday, as ISO 8601 and most of Europe count them.
 */
export function daysToWeekEnd(localDate: string) {
  const weekday = new Date(utcMidnight(localDate)).getUTCDay();
  return weekday === 0 ? 1 : 8 - weekday;
}

export function calendarWindow(startDate: string, days: number, timeZone: string): CalendarWindow {
  return { startDate, endDate: addDays(startDate, days - 1), days, timeZone };
}

/**
 * The UTC `start_date` and `days` to ask Trakt for so that the whole local window is covered. A local day
 * straddles two UTC dates, so this asks for one more day than the window holds whenever the offset is not zero.
 */
export function toTraktQuery(window: CalendarWindow) {
  const start = localMidnight(window.startDate, window.timeZone);
  const end = localMidnight(addDays(window.startDate, window.days), window.timeZone) - 1;
  const utcStart = new Date(start).toISOString().slice(0, 10);
  const utcEnd = new Date(end).toISOString().slice(0, 10);

  return { startDate: utcStart, days: (utcMidnight(utcEnd) - utcMidnight(utcStart)) / DAY_MS + 1 };
}

/** Local date and time of a UTC timestamp, or `undefined` when Trakt sent none (or an unreadable one). */
export function toLocalAiring(firstAired: string | null | undefined, timeZone: string) {
  if (!firstAired) return undefined;

  const instant = Date.parse(firstAired);
  if (Number.isNaN(instant)) return undefined;

  const { date, time } = localParts(instant, timeZone);
  return { localDate: date, localTime: time };
}

export function inWindow(localDate: string, window: CalendarWindow) {
  return localDate >= window.startDate && localDate <= window.endDate;
}

/**
 * Combines the episode and movie calendars. With "all", one failed half must not hide the other: the half
 * that loaded comes back with a warning naming what is missing. Throws when every requested half failed
 * (the episodes error first), and always for an explicit type.
 */
export function settleCalendarHalves<Episode, Movie>(
  type: CalendarType,
  episodesResult: PromiseSettledResult<Episode[]>,
  moviesResult: PromiseSettledResult<Movie[]>,
): { episodes: Episode[]; movies: Movie[]; warning?: string } {
  if (episodesResult.status === "rejected" && (type !== "all" || moviesResult.status === "rejected")) {
    throw episodesResult.reason;
  }
  if (moviesResult.status === "rejected" && type !== "all") throw moviesResult.reason;

  const episodes = episodesResult.status === "fulfilled" ? episodesResult.value : [];
  const movies = moviesResult.status === "fulfilled" ? moviesResult.value : [];
  const warning =
    episodesResult.status === "rejected"
      ? EPISODES_FAILED_WARNING
      : moviesResult.status === "rejected"
        ? MOVIES_FAILED_WARNING
        : undefined;

  return warning ? { episodes, movies, warning } : { episodes, movies };
}
