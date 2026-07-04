import { getPreferenceValues } from "@raycast/api";

const SYSTEM_TIME_ZONE = "system";

export function didaTimeZone(): string {
  const values = getPreferenceValues<Preferences>();
  const timeZone = values.timeZone?.trim();

  if (timeZone && timeZone !== SYSTEM_TIME_ZONE) {
    return timeZone;
  }

  return systemTimeZone();
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function nowInTimeZone(timeZone = didaTimeZone()): Date {
  const parts = zonedDateTimeParts(new Date(), timeZone);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const utcGuess = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ),
  );
  const parts = zonedDateTimeParts(utcGuess, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return Math.round((zonedAsUtc - utcGuess.getTime()) / 60_000);
}

function zonedDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = value("hour");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: hour === 24 ? 0 : hour,
    minute: value("minute"),
    second: value("second"),
  };
}
