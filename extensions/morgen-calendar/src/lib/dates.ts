import { Temporal } from "@js-temporal/polyfill";
import type { Event } from "../types";
import { eventDate, formatDateTime } from "./event-time";

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function toLocalDateTime(date: Date, timeZone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime())
    .toZonedDateTimeISO(timeZone)
    .toPlainDateTime()
    .toString({ smallestUnit: "second" });
}

export function isoDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
    throw new Error("Duration must be between 1 and 10080 minutes.");
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${remainder ? `${remainder}M` : ""}`;
}

export function eventStartDate(event: Event): Date {
  return eventDate(event.start, event.showWithoutTime ? null : event.timeZone);
}

export function formatEventTime(event: Event): string {
  return event.showWithoutTime ? `${event.start.slice(0, 10)} · All day` : formatDateTime(event.start, event.timeZone);
}

export function calendarDayRange(days: number, now = new Date(), zone = systemTimeZone()) {
  if (![1, 7, 14, 30].includes(days)) throw new Error("Unsupported calendar range.");
  const start = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(zone).startOfDay();
  return {
    start: new Date(start.epochMilliseconds),
    end: new Date(start.add({ days }).epochMilliseconds),
  };
}

export function formEventTime(date: Date, time: string, allDay: boolean, zone = systemTimeZone()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error("Choose a valid date.");
  const day = toLocalDateTime(date, zone).slice(0, 10);
  if (allDay)
    return {
      start: `${day}T00:00:00`,
      duration: "P1D",
      timeZone: null,
      showWithoutTime: true,
    };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Enter a start time in HH:mm format.");
  const start = `${day}T${time}:00`;
  // New manual writes reject nonexistent/ambiguous wall times; no silent DST shift.
  Temporal.PlainDateTime.from(start).toZonedDateTime(zone, {
    disambiguation: "reject",
  });
  return { start, timeZone: zone, showWithoutTime: false };
}

export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function durationMinutes(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : 0;
}
