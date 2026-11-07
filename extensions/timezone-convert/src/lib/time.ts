/**
 * Wall-clock math built on `Intl`, so DST rules come from the platform's
 * time zone database instead of a hand-maintained table.
 */

import { formatOffsetLabel, TimeZone } from "./zones";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export type ClockParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions, locale = "en-US"): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    formatters.set(key, cached);
  }
  return cached;
}

function partsIn(zone: TimeZone, instant: number, options: Intl.DateTimeFormatOptions, locale = "en-US") {
  const timeZone = zone.fixedOffsetMinutes === undefined ? zone.id : "UTC";
  const date =
    zone.fixedOffsetMinutes === undefined ? new Date(instant) : new Date(instant + zone.fixedOffsetMinutes * MINUTE);
  return formatter(timeZone, options, locale).formatToParts(date);
}

function numeric(parts: Intl.DateTimeFormatPart[], type: string): number {
  const part = parts.find((candidate) => candidate.type === type);
  return part ? Number(part.value) : 0;
}

/** Calendar date and clock time as seen in `zone` at `instant`. */
export function zonedParts(zone: TimeZone, instant: number): ClockParts {
  const parts = partsIn(zone, instant, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return {
    year: numeric(parts, "year"),
    month: numeric(parts, "month"),
    day: numeric(parts, "day"),
    hour: numeric(parts, "hour") % 24,
    minute: numeric(parts, "minute"),
    second: numeric(parts, "second"),
  };
}

function utcOf(parts: ClockParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** Offset from UTC, in minutes, that `zone` uses at `instant`. */
export function offsetMinutes(zone: TimeZone, instant: number): number {
  if (zone.fixedOffsetMinutes !== undefined) return zone.fixedOffsetMinutes;
  const whole = Math.floor(instant / SECOND) * SECOND;
  return Math.round((utcOf(zonedParts(zone, whole)) - whole) / MINUTE);
}

/** The instant at which `zone` shows the given wall-clock time, or `null` if DST skips it. */
export function instantFromParts(zone: TimeZone, parts: ClockParts): number | null {
  const wallClock = utcOf(parts);
  if (zone.fixedOffsetMinutes !== undefined) return wallClock - zone.fixedOffsetMinutes * MINUTE;
  // First guess treats the wall clock as UTC, the second pass fixes DST edges.
  let instant = wallClock - offsetMinutes(zone, wallClock) * MINUTE;
  instant = wallClock - offsetMinutes(zone, instant) * MINUTE;

  // A spring-forward gap has no instant that shows the requested wall clock.
  const actual = zonedParts(zone, instant);
  if (
    actual.year !== parts.year ||
    actual.month !== parts.month ||
    actual.day !== parts.day ||
    actual.hour !== parts.hour ||
    actual.minute !== parts.minute ||
    actual.second !== parts.second
  ) {
    return null;
  }
  return instant;
}

/** `2026-12-24 18:00` as shown in `zone`, ready to be fed back into the parser. */
export function formatQueryDateTime(zone: TimeZone, instant: number): string {
  const parts = zonedParts(zone, instant);
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const time = `${pad(parts.hour)}:${pad(parts.minute)}${parts.second ? `:${pad(parts.second)}` : ""}`;
  return `${date} ${time}`;
}

export function formatClock(zone: TimeZone, instant: number, hour12: boolean): string {
  return partsIn(zone, instant, { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12 })
    .map((part) => part.value)
    .join("")
    .trim();
}

export function formatDateShort(zone: TimeZone, instant: number): string {
  return partsIn(zone, instant, { weekday: "short", month: "short", day: "numeric" })
    .map((part) => part.value)
    .join("");
}

export function formatDateLong(zone: TimeZone, instant: number): string {
  return partsIn(zone, instant, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    .map((part) => part.value)
    .join("");
}

const abbreviations = new Map<string, string>();

/** `CET`, `EST`, `GMT+5:30` — the zone's own abbreviation at `instant`. */
export function abbreviation(zone: TimeZone, instant: number): string {
  if (zone.fixedOffsetMinutes !== undefined) return formatOffsetLabel(zone.fixedOffsetMinutes);
  const offset = offsetMinutes(zone, instant);
  const key = `${zone.id}|${offset}`;
  const cached = abbreviations.get(key);
  if (cached) return cached;

  const read = (locale: string) => {
    const part = partsIn(zone, instant, { timeZoneName: "short" }, locale).find(
      (candidate) => candidate.type === "timeZoneName",
    );
    return part?.value ?? "";
  };

  let name = read("en-US");
  if (/^GMT[+-]/.test(name)) {
    // en-US falls back to "GMT+1" for most of Europe; en-GB knows CET, EET, …
    const british = read("en-GB");
    if (british && !/^GMT[+-]/.test(british)) name = british;
  }
  if (!name) name = formatOffsetLabel(offset);
  abbreviations.set(key, name);
  return name;
}

export function formatOffset(minutes: number): string {
  return formatOffsetLabel(minutes);
}

/** Whole days between the calendar dates of `reference` and `zone`. */
export function dayDifference(reference: TimeZone, zone: TimeZone, instant: number): number {
  const a = zonedParts(reference, instant);
  const b = zonedParts(zone, instant);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY);
}

/** Difference between two UTC offsets, e.g. `+9h`, `-6h`, `+5:30`. */
export function formatOffsetDifference(minutes: number): string {
  if (minutes === 0) return "same";
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h${String(mins).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE));
  if (total < 1) return "less than a minute";
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/** `in 3h`, `2h ago`, `now`. */
export function describeRelative(instant: number, now: number): string {
  const diff = instant - now;
  if (Math.abs(diff) < 30 * SECOND) return "now";
  return diff > 0 ? `in ${formatDuration(diff)}` : `${formatDuration(-diff)} ago`;
}
