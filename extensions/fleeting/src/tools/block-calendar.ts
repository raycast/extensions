import { getPreferenceValues } from "@raycast/api";
import { getMeeting, isMeetingId } from "../data/meetings";
import { CalendarEvent, RECURRENCE_LABELS, Recurrence, localTimeZone } from "../lib/calendar";
import { CalendarProvider, exportCalendarEvent, isCalendarProvider } from "../lib/calendar-export";
import { resolveMeetingId } from "../lib/urls";

type Input = {
  /** Start date and time in ISO 8601 with an explicit UTC offset or Z, e.g. 2030-01-15T10:00:00+05:30. Ask for a time if missing. */
  start: string;
  /** A meeting ID from list-meetings. Omit to use the preferred meeting. */
  meetingId?: string;
  /** Event title. Omit to use the meeting title. */
  title?: string;
  /** Positive whole number of minutes. Omit to use the default duration. */
  durationMinutes?: number;
  /** Calendar destination. Omit to use the preferred calendar. Recurring Outlook events use an .ics file. */
  provider?: CalendarProvider;
  /** Recurrence in the device's local time zone. Defaults to 'none'. */
  recurrence?: Recurrence;
  /** Include the join link in the location and description. Omit to use preferences. */
  includeJoinLink?: boolean;
  /** Request private visibility. Calendar links cannot set it; .ics files can. Omit to use preferences. */
  isPrivate?: boolean;
};

/** Opens a prefilled calendar draft or saves and opens an .ics invite. The user must save or import it to block time. */
export default async function tool(input: Input) {
  const prefs = getPreferenceValues<Preferences>();
  const meetingId = input.meetingId ?? resolveMeetingId(prefs.preferredMeeting);
  if (!isMeetingId(meetingId)) throw new Error("Unknown meeting ID. Use list-meetings to find an ID.");
  const provider = input.provider ?? prefs.preferredCalendar;
  if (!isCalendarProvider(provider)) throw new Error("Choose google, outlook, or ics as the calendar provider.");
  const recurrence = input.recurrence ?? "none";
  if (!Object.hasOwn(RECURRENCE_LABELS, recurrence)) throw new Error("Unknown recurrence rule.");
  const duration = input.durationMinutes ?? Number(prefs.defaultDuration);
  if (!Number.isSafeInteger(duration) || duration <= 0)
    throw new Error("Duration must be a positive whole number of minutes.");
  // Require an offset to avoid silently interpreting AI-generated dates in the wrong zone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input.start)) {
    throw new Error("Start must be an ISO 8601 date-time with an explicit UTC offset or Z.");
  }
  const start = new Date(input.start);
  const wallTime = new Date(input.start.replace(/(?:Z|[+-]\d{2}:\d{2})$/, "Z"));
  if (Number.isNaN(wallTime.getTime()) || wallTime.toISOString().slice(0, 16) !== input.start.slice(0, 16)) {
    throw new Error("Choose a valid start date and time.");
  }
  const event: CalendarEvent = {
    meetingId,
    title: input.title ?? getMeeting(meetingId).title,
    start,
    end: new Date(start.getTime() + duration * 60_000),
    timeZone: localTimeZone(),
    includeJoinLink: input.includeJoinLink ?? prefs.includeJoinLink,
    isPrivate: input.isPrivate ?? prefs.defaultPrivate,
    recurrence,
  };
  const result = await exportCalendarEvent(provider, event);
  return {
    ...result,
    requestedProvider: provider,
    meetingId,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    timeZone: event.timeZone,
    recurrence,
    includeJoinLink: event.includeJoinLink,
    isPrivateRequested: event.isPrivate,
    requiresSaveOrImport: true,
  };
}
