import { getCalendarClient, withGoogleAPIs } from "../lib/google";
import { getCalendarWithLabels, getEventLabels } from "../lib/calendar-resources";
import { serializeEvent } from "../lib/events";

type Input = {
  /** Google Calendar event ID, usually obtained from search-events. */
  eventId: string;
  /** Calendar containing the event. Defaults to "primary". */
  calendarId?: string;
  /** IANA time zone used for returned start/end values. */
  timeZone?: string;
  /** Maximum attendees to include. Omit for Google's default behavior. */
  maxAttendees?: number;
};

const tool = async (input: Input) => {
  const calendarId = input.calendarId ?? "primary";
  const [response, calendar] = await Promise.all([
    getCalendarClient().events.get({
      calendarId,
      eventId: input.eventId,
      timeZone: input.timeZone,
      maxAttendees: input.maxAttendees,
    }),
    getCalendarWithLabels(calendarId),
  ]);
  return serializeEvent(response.data, calendarId, getEventLabels(calendar));
};

export default withGoogleAPIs(tool);
