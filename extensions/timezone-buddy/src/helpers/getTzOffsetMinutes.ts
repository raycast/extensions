import { getDateWithOffset } from "./getDateWithOffset";

/**
 * Offset of a timezone from UTC in minutes, for a given moment.
 *
 * Uses the reliable "format the instant as wall-clock, read it back as if it
 * were UTC" trick, which correctly accounts for DST and fractional-hour zones
 * (e.g. India +5:30, Nepal +5:45) without parsing locale-formatted strings.
 */
export function getTzOffsetMinutes(tz: string, offsetHrs?: number): number {
  const date = getDateWithOffset(offsetHrs);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      // "24" is emitted by some engines for midnight; normalise to 0.
      map[part.type] = part.value === "24" ? 0 : Number(part.value);
    }
  }

  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Offset in minutes of `tz` relative to the local timezone. */
export function getRelativeOffsetMinutes(tz: string, offsetHrs?: number): number {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return getTzOffsetMinutes(tz, offsetHrs) - getTzOffsetMinutes(localTz, offsetHrs);
}
