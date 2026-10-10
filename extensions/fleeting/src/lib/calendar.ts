import { MeetingId, getMeeting } from "../data/meetings";
import { meetingUrl } from "./urls";

export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export type CalendarEvent = {
  meetingId: MeetingId;
  title: string;
  start: Date;
  end: Date;
  timeZone: string;
  includeJoinLink: boolean;
  isPrivate: boolean;
  recurrence: Recurrence;
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Does Not Repeat",
  daily: "Daily",
  weekdays: "Every Weekday",
  weekly: "Weekly",
  monthly: "Monthly",
};

const RRULES: Record<Exclude<Recurrence, "none">, string> = {
  daily: "FREQ=DAILY",
  weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "FREQ=WEEKLY",
  monthly: "FREQ=MONTHLY",
};

export function rrule(recurrence: Recurrence): string | undefined {
  return recurrence === "none" ? undefined : RRULES[recurrence];
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Returns an error message, or undefined if the event is valid. */
export function validateEvent(event: CalendarEvent): string | undefined {
  if (!event.title.trim()) return "Event title is required";
  if (Number.isNaN(event.start.getTime())) return "Choose a valid start date and time";
  if (Number.isNaN(event.end.getTime()) || event.end <= event.start) return "End time must be after start time";
  return undefined;
}

export function eventDescription(event: CalendarEvent): string {
  const lines = [`${getMeeting(event.meetingId).title} — a fictional, synthetic meeting from Fleeting.`];
  if (event.includeJoinLink) lines.push("", `Join: ${meetingUrl(event.meetingId)}`);
  return lines.join("\n");
}

export function eventLocation(event: CalendarEvent): string {
  return event.includeJoinLink ? meetingUrl(event.meetingId) : "";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local wall-clock time as YYYYMMDDTHHMMSS (no zone suffix). */
export function formatLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** UTC time as YYYYMMDDTHHMMSSZ. */
export function formatUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  const p = url.searchParams;
  p.set("action", "TEMPLATE");
  p.set("text", event.title);
  // Local times plus ctz keep recurring events stable across DST changes.
  p.set("dates", `${formatLocal(event.start)}/${formatLocal(event.end)}`);
  p.set("ctz", event.timeZone);
  p.set("details", eventDescription(event));
  const location = eventLocation(event);
  if (location) p.set("location", location);
  const rule = rrule(event.recurrence);
  if (rule) p.set("recur", `RRULE:${rule}`);
  p.set("trp", "true"); // show as Busy
  return url.toString();
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const url = new URL("https://outlook.office.com/calendar/0/deeplink/compose");
  const p = url.searchParams;
  p.set("path", "/calendar/action/compose");
  p.set("rru", "addevent");
  p.set("subject", event.title);
  p.set("startdt", event.start.toISOString());
  p.set("enddt", event.end.toISOString());
  p.set("body", eventDescription(event));
  const location = eventLocation(event);
  if (location) p.set("location", location);
  return url.toString();
}
