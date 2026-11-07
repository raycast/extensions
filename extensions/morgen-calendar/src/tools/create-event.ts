import { resolveCalendar } from "../lib/calendar-reference";
import { Temporal } from "@js-temporal/polyfill";
import { Tool } from "@raycast/api";
import { createEvent, listCalendars } from "../lib/morgen";

type Input = {
  /** Exact opaque calendar reference returned by list-calendars. */
  calendarRef: string;
  /** Event title supplied by the user. */
  title: string;
  /** Local date and time in YYYY-MM-DDTHH:mm:ss format, without offset. */
  start: string;
  /** IANA timezone, e.g. America/Argentina/Cordoba. */
  timeZone: string;
  /** Positive whole number of minutes, at most 1440. */
  durationMinutes: number;
};

async function prepare(input: Input) {
  if (!input.title.trim()) throw new Error("An event title is required.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input.start)) {
    throw new Error("Start must be a local date/time in YYYY-MM-DDTHH:mm:ss format.");
  }
  const date = new Date(`${input.start}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== input.start) {
    throw new Error("Start must be a valid date and time.");
  }
  if (!input.timeZone || /^[+-]/.test(input.timeZone)) throw new Error("An IANA timezone is required.");
  new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format(date);
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 1440) {
    throw new Error("Duration must be a whole number of minutes between 1 and 1440.");
  }
  Temporal.PlainDateTime.from(input.start, { overflow: "reject" }).toZonedDateTime(input.timeZone, {
    disambiguation: "reject",
  });
  const calendars = await listCalendars(true);
  const calendar = resolveCalendar(input.calendarRef, calendars);
  if (!calendar || !(calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn)) {
    throw new Error("Select a writable calendar returned by list-calendars.");
  }
  return calendar;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const calendar = await prepare(input);
  return {
    message: "Create this Morgen event?",
    info: [
      { name: "Title", value: input.title.trim() },
      { name: "Calendar", value: calendar.name },
      { name: "Start", value: `${input.start} (${input.timeZone})` },
      { name: "Duration", value: `${input.durationMinutes} minutes` },
    ],
  };
};

export default async function tool(input: Input) {
  const calendar = await prepare(input);
  const event = await createEvent({
    accountId: calendar.accountId,
    calendarId: calendar.id,
    title: input.title.trim(),
    start: input.start,
    duration: `PT${input.durationMinutes}M`,
    timeZone: input.timeZone,
    showWithoutTime: false,
  });
  return {
    id: event.id,
    calendarRef: input.calendarRef,
    title: event.title,
    start: event.start,
    timeZone: event.timeZone,
    duration: event.duration,
  };
}
