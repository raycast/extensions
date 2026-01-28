import humanizeDuration from "humanize-duration";
import { withGoogleAPIs, getCalendarClient } from "../lib/google";
import { addSignature, toISO8601WithTimezoneOffset } from "../lib/utils";
import { parseISO, addMinutes } from "date-fns";

type Input = {
  /**
   * The ID of the event to edit
   */
  eventId: string;
  /**
   * The title of the event
   */
  title?: string;
  /**
   * The start date of the event in ISO 8601 format with timezone offset
   * @example "2024-03-20T15:30:00-07:00" or "2024-03-20T15:30:00+02:00"
   * @remarks For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC)
   */
  startDate?: string;
  /**
   * The duration of the event in minutes
   */
  duration?: number;
  /**
   * The email addresses of the attendees of the event
   */
  attendees?: string[];
  /**
   * The conferencing provider of the event
   */
  conferencingProvider?: string;
  /**
   * The description of the event
   */
  description?: string;
  /**
   * The ID of the calendar where the event is located
   * @default "primary"
   * @remarks If not provided, the event will be updated in the user's primary calendar. The calendar ID can be found using the `list-calendars` tool.
   */
  calendarId?: string;
};

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const calendar = getCalendarClient();
  const event = await calendar.events.get({
    calendarId: input.calendarId ?? "primary",
    eventId: input.eventId,
  });

  if (!event.data.start?.dateTime || !event.data.end?.dateTime) {
    throw new Error("Event has invalid start or end time");
  }

  if (!input.attendees) {
    return;
  }

  const changes: { name: string; value: string }[] = [];

  if (input.title) {
    changes.push({ name: "Title", value: `${event.data.summary || ""} → ${input.title}` });
  }
  if (input.startDate) {
    changes.push({
      name: "Start",
      value: `${new Date(event.data.start.dateTime).toLocaleString()} → ${new Date(input.startDate).toLocaleString()}`,
    });
  }
  if (input.duration) {
    const currentStart = new Date(event.data.start.dateTime);
    const currentEnd = new Date(event.data.end.dateTime);
    const currentDuration = currentEnd.getTime() - currentStart.getTime();
    changes.push({
      name: "Duration",
      value: `${humanizeDuration(currentDuration)} → ${humanizeDuration(input.duration * 60 * 1000)}`,
    });
  }
  if (input.attendees) {
    const currentAttendees = event.data.attendees?.map((a) => a.email || "").join(", ") || "none";
    changes.push({ name: "Attendees", value: `${currentAttendees} → ${input.attendees.join(", ")}` });
  }
  if (input.description !== undefined) {
    changes.push({
      name: "Description",
      value: `${event.data.description || "none"} → ${input.description || "none"}`,
    });
  }

  if (changes.length === 0) {
    return;
  }

  return {
    message: "Are you sure you want to update this event with the following changes?",
    info: changes,
  };
});

const tool = async (input: Input) => {
  const calendar = getCalendarClient();

  const existingEvent = await calendar.events.get({
    calendarId: input.calendarId ?? "primary",
    eventId: input.eventId,
  });

  if (!existingEvent.data.start?.dateTime || !existingEvent.data.end?.dateTime) {
    throw new Error("Event has invalid start or end time");
  }

  // Calculate the current duration in minutes
  const currentStart = new Date(existingEvent.data.start.dateTime);
  const currentEnd = new Date(existingEvent.data.end.dateTime);
  const currentDurationMinutes = (currentEnd.getTime() - currentStart.getTime()) / (60 * 1000);

  let startDate = currentStart;
  if (input.startDate) {
    startDate = parseISO(input.startDate);
  }

  const endDate = addMinutes(startDate, input.duration ?? currentDurationMinutes);

  const requestBody = {
    summary: input.title ?? existingEvent.data.summary ?? "",
    description:
      input.description !== undefined ? addSignature(input.description) : (existingEvent.data.description ?? ""),
    start: {
      dateTime: toISO8601WithTimezoneOffset(startDate),
    },
    end: {
      dateTime: toISO8601WithTimezoneOffset(endDate),
    },
    attendees: input.attendees ? input.attendees.map((email) => ({ email })) : existingEvent.data.attendees,
    location: input.conferencingProvider ?? existingEvent.data.location ?? "",
  };

  await calendar.events.update({
    calendarId: input.calendarId ?? "primary",
    eventId: input.eventId,
    requestBody,
  });
};

export default withGoogleAPIs(tool);
