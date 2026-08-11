import { didaTimeZone, timeZoneOffsetMinutes } from "./timezone.js";

export function toDidaDate(date?: Date | null, timeZone = didaTimeZone()): string | undefined {
  if (!date) {
    return undefined;
  }

  const offsetMinutes = timeZoneOffsetMinutes(date, timeZone);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}${sign}${hours}${minutes}`;
}

export function formatTaskDate(value?: string, timeZone = didaTimeZone()): string {
  if (!value) {
    return "No date";
  }

  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function reminderTrigger(kind: string): string[] | undefined {
  switch (kind) {
    case "at_due":
      return ["TRIGGER:PT0S"];
    case "5m":
      return ["TRIGGER:-PT5M"];
    case "10m":
      return ["TRIGGER:-PT10M"];
    case "30m":
      return ["TRIGGER:-PT30M"];
    case "1h":
      return ["TRIGGER:-PT1H"];
    case "1d":
      return ["TRIGGER:-P1D"];
    default:
      return undefined;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
