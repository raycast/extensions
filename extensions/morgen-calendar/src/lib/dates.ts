import type { Event } from "../types";

export function toLocalDateTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function isoDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
    throw new Error("Duration must be between 1 and 10080 minutes.");
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${remainder ? `${remainder}M` : ""}`;
}

export function durationMinutes(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : 0;
}

export function eventStartDate(event: Event): Date {
  const zone = event.timeZone ?? systemTimeZone();
  const utcGuess = Date.parse(`${event.start}Z`);
  if (!Number.isFinite(utcGuess)) return new Date(NaN);
  let timestamp = utcGuess;
  for (let i = 0; i < 3; i++) {
    const represented = Date.parse(
      `${toLocalDateTime(new Date(timestamp), zone)}Z`,
    );
    timestamp += utcGuess - represented;
  }
  return new Date(timestamp);
}

export function formatEventTime(event: Event): string {
  if (event.showWithoutTime) return event.start.slice(0, 10);
  const date = eventStartDate(event);
  return Number.isNaN(date.getTime())
    ? event.start
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
