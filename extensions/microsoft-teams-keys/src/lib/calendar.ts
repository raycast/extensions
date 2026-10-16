import { runAppleScript } from "@raycast/utils";
import { findMeetingLink } from "./links";

export interface Meeting {
  id: string;
  title: string;
  start: Date;
  end: Date;
  calendar: string;
  link: string;
  allDay: boolean;
}

interface RawEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  calendar: string;
  allDay: boolean;
  url: string;
  location: string;
  notes: string;
}

export class CalendarAccessError extends Error {
  constructor(detail: string) {
    super(
      `Raycast may not read your calendars yet. Allow Raycast in System Settings › Privacy & Security › Calendars (full access) and, if asked, let it control Calendar. (${detail})`,
    );
    this.name = "CalendarAccessError";
  }
}

const UNIT = "\u001F";
const RECORD = "\u001E";

/**
 * Fallback: asks the Calendar app itself. Slower than EventKit, but it works
 * when the EventKit route has no permission, because Calendar has its own.
 * Dates travel as seconds relative to now, which avoids AppleScript date
 * formats that depend on the system language.
 */
function calendarAppScript(fromOffset: number, toOffset: number): string {
  return `set us to (ASCII character 31)
set rs to (ASCII character 30)
set nowDate to current date
-- The script's own "now" as Unix time, so the offsets below can be turned
-- back into absolute times without the delay of starting the script.
set epochNow to do shell script "date +%s"
set fromDate to nowDate + (${fromOffset})
set toDate to nowDate + (${toOffset})
set out to "N" & us & epochNow & rs
tell application "Calendar"
  repeat with c in calendars
    set calName to name of c
    set out to out & "C" & us & calName & rs
    try
      set evs to (every event of c whose start date is less than toDate and end date is greater than fromDate)
    on error
      set out to out & "F" & us & calName & rs
      set evs to {}
    end try
    repeat with e in evs
      set evUrl to ""
      set evLoc to ""
      set evNotes to ""
      set evAllDay to "false"
      try
        set evUrl to (url of e) as text
      end try
      try
        set evLoc to (location of e) as text
      end try
      try
        set evNotes to (description of e) as text
      end try
      try
        if allday event of e then set evAllDay to "true"
      end try
      if evUrl is "missing value" then set evUrl to ""
      if evLoc is "missing value" then set evLoc to ""
      if evNotes is "missing value" then set evNotes to ""
      set out to out & "E" & us & (uid of e) & us & (summary of e) & us & (((start date of e) - nowDate) as text) & us & (((end date of e) - nowDate) as text) & us & calName & us & evAllDay & us & evUrl & us & evLoc & us & evNotes & rs
    end repeat
  end repeat
end tell
return out`;
}

interface EventRead {
  events: RawEvent[];
  /** Calendars that could not be read; their meetings are missing. */
  failed: string[];
}

async function eventsFromCalendarApp(from: Date, to: Date): Promise<EventRead> {
  const jsNow = Date.now();
  const raw = await runAppleScript(
    calendarAppScript(Math.floor((from.getTime() - jsNow) / 1000), Math.ceil((to.getTime() - jsNow) / 1000)),
    { timeout: 120_000 },
  );
  // Offsets are relative to the script's own "now", which it reports first.
  let now = jsNow / 1000;
  let calendars = 0;
  const failed: string[] = [];
  const events: RawEvent[] = [];
  for (const record of raw.split(RECORD)) {
    const [kind, ...fields] = record.replace(/^[\r\n]+/, "").split(UNIT);
    if (kind === "N") {
      const value = Number(fields[0]);
      if (Number.isFinite(value) && value > 0) now = value;
    } else if (kind === "C") {
      calendars++;
    } else if (kind === "F") {
      failed.push(fields[0] ?? "");
    } else if (kind === "E") {
      const [uid, title, start, end, calendar, allDay, url, location, ...notes] = fields;
      const startSeconds = now + Number(start);
      events.push({
        id: `${uid}@${Math.round(startSeconds)}`,
        title: title ?? "",
        start: startSeconds,
        end: now + Number(end),
        calendar: calendar ?? "",
        allDay: allDay === "true",
        url: url ?? "",
        location: location ?? "",
        notes: notes.join(UNIT),
      });
    }
  }
  if (calendars > 0 && failed.length === calendars) {
    throw new Error(`the Calendar app could not read any calendar (${failed.join(", ")})`);
  }
  return { events, failed };
}

async function eventsFromEventKit(from: Date, to: Date): Promise<RawEvent[] | string> {
  const raw = await runAppleScript(script(Math.floor(from.getTime() / 1000), Math.floor(to.getTime() / 1000)), {
    language: "JavaScript",
    timeout: 90_000,
  });
  if (raw.trim().startsWith("NO_ACCESS")) return raw.trim();
  return JSON.parse(raw) as RawEvent[];
}

/** EventKit first, the Calendar app when EventKit is not allowed. */
async function readEvents(from: Date, to: Date): Promise<EventRead> {
  let eventKit: RawEvent[] | string;
  try {
    eventKit = await eventsFromEventKit(from, to);
  } catch (error) {
    eventKit = `EventKit failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (Array.isArray(eventKit)) return { events: eventKit, failed: [] };
  try {
    return await eventsFromCalendarApp(from, to);
  } catch (error) {
    throw new CalendarAccessError(
      `${eventKit}; Calendar app: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Reads events from the macOS calendar database (EventKit), the same one the
 * Calendar app shows, so an Exchange or Microsoft 365 account added there is
 * included. JavaScript for Automation reaches EventKit without a helper app.
 */
function script(fromSeconds: number, toSeconds: number): string {
  return `
ObjC.import("EventKit");
ObjC.import("Foundation");
function run() {
  const store = $.EKEventStore.alloc.init;
  let status = Number($.EKEventStore.authorizationStatusForEntityType(0));
  // 0 not determined, 1 restricted, 2 denied, 3 full access, 4 write only
  if (status === 0) {
    let done = false;
    const callback = function (granted, error) { done = true; };
    if (store.respondsToSelector("requestFullAccessToEventsWithCompletion:")) {
      store.requestFullAccessToEventsWithCompletion(callback);
    } else {
      store.requestAccessToEntityTypeCompletion(0, callback);
    }
    const until = $.NSDate.dateWithTimeIntervalSinceNow(60);
    while (!done && $.NSDate.date.compare(until) < 0) {
      $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));
    }
    status = Number($.EKEventStore.authorizationStatusForEntityType(0));
  }
  if (status !== 3) return "NO_ACCESS:" + status;
  const from = $.NSDate.dateWithTimeIntervalSince1970(${fromSeconds});
  const to = $.NSDate.dateWithTimeIntervalSince1970(${toSeconds});
  const calendars = store.calendarsForEntityType(0);
  const predicate = store.predicateForEventsWithStartDateEndDateCalendars(from, to, calendars);
  const events = store.eventsMatchingPredicate(predicate);
  const out = [];
  const count = events.count;
  for (let i = 0; i < count; i++) {
    const e = events.objectAtIndex(i);
    const text = (value) => (value && !value.isNil() ? ObjC.unwrap(value) : "");
    out.push({
      id: text(e.eventIdentifier) + "@" + e.startDate.timeIntervalSince1970,
      title: text(e.title),
      start: e.startDate.timeIntervalSince1970,
      end: e.endDate.timeIntervalSince1970,
      calendar: text(e.calendar.title),
      allDay: Boolean(e.allDay),
      url: e.URL && !e.URL.isNil() ? ObjC.unwrap(e.URL.absoluteString) : "",
      location: text(e.location),
      notes: text(e.notes),
    });
  }
  return JSON.stringify(out);
}`;
}

export interface MeetingsRead {
  /** Teams meetings, sorted by start time. */
  meetings: Meeting[];
  /** Calendars that could not be read, so their meetings may be missing. */
  failedCalendars: string[];
}

/** Teams meetings between `from` and `to`, plus the calendars that could not be read. */
export async function teamsMeetings(from: Date, to: Date): Promise<MeetingsRead> {
  const { events, failed } = await readEvents(from, to);
  const meetings: Meeting[] = [];
  for (const event of events) {
    // MeetingBar's order: the URL field, then the location, then the notes.
    const link = findMeetingLink(event.url, event.location, event.notes);
    if (!link) continue;
    meetings.push({
      id: event.id,
      title: event.title || "Untitled meeting",
      start: new Date(event.start * 1000),
      end: new Date(event.end * 1000),
      calendar: event.calendar,
      link,
      allDay: event.allDay,
    });
  }
  return { meetings: meetings.sort((a, b) => a.start.getTime() - b.start.getTime()), failedCalendars: failed };
}

/** Text for a warning about calendars that could not be read. */
export function failedCalendarsText(failed: string[]): string {
  return `Could not read ${failed.length === 1 ? "the calendar" : "the calendars"} ${failed.join(", ")}, so meetings there may be missing.`;
}

/**
 * The meeting to join now: one that is running, else the next one starting
 * within `aheadMinutes`. Among running meetings the one that started last wins.
 */
export function pickMeetingToJoin(meetings: Meeting[], now = new Date(), aheadMinutes = 15): Meeting | undefined {
  const timed = meetings.filter((m) => !m.allDay);
  const running = timed
    .filter((m) => m.start <= now && m.end > now)
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  if (running.length > 0) return running[0];
  const soon = new Date(now.getTime() + aheadMinutes * 60_000);
  return timed.find((m) => m.start > now && m.start <= soon);
}
