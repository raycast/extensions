export function getHourInTz(timezone: string, date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = parseInt(hourPart, 10);
  // Some locales report midnight as "24"; normalize to 0.
  return hour === 24 ? 0 : hour;
}

export function getMinuteInTz(timezone: string, date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
  return parseInt(minutePart, 10);
}

export function formatTimeInTz(timezone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isNightInTz(timezone: string, date: Date = new Date()): boolean {
  const hour = getHourInTz(timezone, date);
  return hour >= 22 || hour < 7;
}

/** Minutes since local midnight in the given timezone. Used for sorting. */
export function minutesSinceMidnight(timezone: string, date: Date = new Date()): number {
  return getHourInTz(timezone, date) * 60 + getMinuteInTz(timezone, date);
}

/** Returns the UTC offset string for a timezone, e.g. "GMT-4" or "GMT+5:30". */
export function getGMTOffsetString(tz: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/** Returns offset from UTC in minutes for a timezone. */
export function getOffsetFromUTCMinutes(tz: string, date: Date = new Date()): number {
  const offsetStr = getGMTOffsetString(tz, date);
  const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] ?? "0", 10);
  return sign * (hours * 60 + minutes);
}

/** Returns a human-readable label for the diff between a timezone and the user's local time. */
export function getDiffFromLocalLabel(tz: string, date: Date = new Date()): string {
  const localOffsetMins = -date.getTimezoneOffset();
  const tzOffsetMins = getOffsetFromUTCMinutes(tz, date);
  const diffMins = tzOffsetMins - localOffsetMins;
  if (diffMins === 0) return "same as you";
  const absMins = Math.abs(diffMins);
  const sign = diffMins > 0 ? "+" : "-";
  if (absMins % 60 === 0) {
    return `${sign}${absMins / 60}h from you`;
  }
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return h > 0 ? `${sign}${h}h ${m}min from you` : `${sign}${m}min from you`;
}
