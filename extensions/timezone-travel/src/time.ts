interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface CitySnapshot {
  daySerial: number;
  hour: number;
  isWorkingHour: boolean;
  timeline: string;
}

export type TimeQueryIssue = "incomplete" | "unrecognized" | "out-of-range" | "unavailable";

export type TimeQueryResult = { status: "valid"; date: Date } | { status: "invalid"; reason: TimeQueryIssue };

const RELATIVE_UNITS = [
  "minutes",
  "minute",
  "mins",
  "min",
  "m",
  "hours",
  "hour",
  "hrs",
  "hr",
  "h",
  "days",
  "day",
  "d",
] as const;
const RELATIVE_QUERY_PATTERN = new RegExp(`^([+-])\\s*(\\d+(?:\\.\\d+)?)\\s*(${RELATIVE_UNITS.join("|")})$`);

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const displayFormatters = new Map<string, Intl.DateTimeFormat>();

function getDisplayFormatter(
  key: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cached = displayFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale, options);
  displayFormatters.set(key, formatter);
  return formatter;
}

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timeFormatters.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  timeFormatters.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const values = Object.fromEntries(
    getPartsFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function sameWallClock(left: ZonedParts, right: ZonedParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function hasAlternativeWallClockMatch(candidate: number, parts: ZonedParts, timeZone: string): boolean {
  const searchRangeMinutes = 180;

  for (let offsetMinutes = -searchRangeMinutes; offsetMinutes <= searchRangeMinutes; offsetMinutes += 15) {
    if (offsetMinutes === 0) continue;

    const alternative = new Date(candidate + offsetMinutes * 60_000);
    if (sameWallClock(getZonedParts(alternative, timeZone), parts)) return true;
  }

  return false;
}

function zonedWallClockToInstant(parts: ZonedParts, timeZone: string): Date | undefined {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let candidate = desiredUtc;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = getZonedParts(new Date(candidate), timeZone);
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const adjustment = desiredUtc - actualUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }

  const result = new Date(candidate);
  if (!sameWallClock(getZonedParts(result, timeZone), parts)) return undefined;
  if (hasAlternativeWallClockMatch(candidate, parts, timeZone)) return undefined;
  return result;
}

export function shiftInstant(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function looksLikeIncompleteQuery(query: string): boolean {
  if (["today", "tomorrow", "yesterday"].some((word) => word.startsWith(query))) return true;

  const relativePrefix = query.match(/^([+-])\s*(\d*(?:\.\d*)?)\s*([a-z]*)$/);
  if (relativePrefix) {
    const amount = relativePrefix[2];
    const unit = relativePrefix[3];
    return (
      !amount ||
      amount.endsWith(".") ||
      !unit ||
      RELATIVE_UNITS.some((candidate) => candidate.startsWith(unit))
    );
  }

  const clock = query.replace(/^(today|tomorrow|yesterday)\s+/, "");
  return /^\d{1,2}:\d?$/.test(clock) || /^\d{1,2}(?::\d{2})?\s*[ap]$/.test(clock);
}

export function parseTimeQueryResult(query: string, base: Date, anchorTimeZone: string): TimeQueryResult {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return { status: "invalid", reason: "incomplete" };
  if (normalized === "now") return { status: "valid", date: new Date() };

  const relative = normalized.match(RELATIVE_QUERY_PATTERN);
  if (relative) {
    const direction = relative[1] === "+" ? 1 : -1;
    const amount = Number(relative[2]);
    const unit = relative[3][0];
    const multiplier = unit === "d" ? 1_440 : unit === "h" ? 60 : 1;
    const shifted = shiftInstant(base, direction * amount * multiplier);
    return Number.isFinite(shifted.getTime())
      ? { status: "valid", date: shifted }
      : { status: "invalid", reason: "out-of-range" };
  }

  const clock = normalized.match(/^(?:(today|tomorrow|yesterday)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!clock) {
    return {
      status: "invalid",
      reason: looksLikeIncompleteQuery(normalized) ? "incomplete" : "unrecognized",
    };
  }

  const dayWord = clock[1];
  let hour = Number(clock[2]);
  const minute = Number(clock[3] ?? 0);
  const meridiem = clock[4];

  if (minute > 59) return { status: "invalid", reason: "out-of-range" };
  if (meridiem) {
    if (hour < 1 || hour > 12) return { status: "invalid", reason: "out-of-range" };
    hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  } else if (hour > 23) {
    return { status: "invalid", reason: "out-of-range" };
  }

  const baseParts = getZonedParts(base, anchorTimeZone);
  const dayOffset = dayWord === "tomorrow" ? 1 : dayWord === "yesterday" ? -1 : 0;
  const shiftedDay = new Date(Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day + dayOffset));

  const date = zonedWallClockToInstant(
    {
      year: shiftedDay.getUTCFullYear(),
      month: shiftedDay.getUTCMonth() + 1,
      day: shiftedDay.getUTCDate(),
      hour,
      minute,
      second: 0,
    },
    anchorTimeZone,
  );

  return date ? { status: "valid", date } : { status: "invalid", reason: "unavailable" };
}

export function parseTimeQuery(query: string, base: Date, anchorTimeZone: string): Date | undefined {
  const result = parseTimeQueryResult(query, base, anchorTimeZone);
  return result.status === "valid" ? result.date : undefined;
}

export function formatTimeInZone(date: Date, timeZone: string, use24Hour: boolean): string {
  return getDisplayFormatter(`time:${timeZone}:${use24Hour ? "24" : "12"}`, use24Hour ? "en-GB" : "en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  }).format(date);
}

export function formatDateInZone(date: Date, timeZone: string): string {
  return getDisplayFormatter(`date:${timeZone}`, "en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeZoneName(date: Date, timeZone: string): string {
  const parts = getDisplayFormatter(`zone:${timeZone}`, "en-US", {
    timeZone,
    timeZoneName: "long",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

function daySerial(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

export function describeDayDifference(date: Date, anchorTimeZone: string, timeZone: string): string {
  return describeDayOffset(daySerial(date, timeZone) - daySerial(date, anchorTimeZone));
}

export function describeDayOffset(difference: number): string {
  if (difference === 0) return "Same day";
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  return difference > 0 ? `${difference} days ahead` : `${Math.abs(difference)} days behind`;
}

export function localHour(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  return parts.hour + parts.minute / 60;
}

function isWorkingHourValue(hour: number): boolean {
  return hour >= 9 && hour < 17;
}

export function isWorkingHour(date: Date, timeZone: string): boolean {
  return isWorkingHourValue(localHour(date, timeZone));
}

export function buildTimeline(date: Date, timeZone: string): string {
  return buildTimelineFromHour(localHour(date, timeZone));
}

function buildTimelineFromHour(hour: number): string {
  const markerIndex = Math.min(23, Math.floor(hour));
  return Array.from({ length: 24 }, (_, index) => (index === markerIndex ? "●" : "·")).join("");
}

export function getCitySnapshot(date: Date, timeZone: string): CitySnapshot {
  const parts = getZonedParts(date, timeZone);
  const hour = parts.hour + parts.minute / 60;
  return {
    daySerial: Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000,
    hour,
    isWorkingHour: isWorkingHourValue(hour),
    timeline: buildTimelineFromHour(hour),
  };
}
