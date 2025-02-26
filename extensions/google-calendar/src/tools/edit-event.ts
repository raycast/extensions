import humanizeDuration from "humanize-duration";
import { withGoogleAPIs, getCalendarClient } from "../google";
import { addSignature } from "../utils";

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
   * The start date of the event in ISO 8601 format
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
};

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const calendar = getCalendarClient();
  const event = await calendar.events.get({
    calendarId: "primary",
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
    calendarId: "primary",
    eventId: input.eventId,
  });

  if (!existingEvent.data.start?.dateTime || !existingEvent.data.end?.dateTime) {
    throw new Error("Event has invalid start or end time");
  }

  // Calculate the current duration in minutes
  const currentStart = new Date(existingEvent.data.start.dateTime);
  const currentEnd = new Date(existingEvent.data.end.dateTime);
  const currentDurationMinutes = (currentEnd.getTime() - currentStart.getTime()) / (60 * 1000);

  const requestBody = {
    summary: input.title ?? existingEvent.data.summary ?? "",
    description:
      input.description !== undefined ? addSignature(input.description) : (existingEvent.data.description ?? ""),
    start: {
      dateTime: input.startDate ?? existingEvent.data.start.dateTime,
    },
    end: {
      dateTime: input.startDate
        ? new Date(
            new Date(input.startDate).getTime() + (input.duration ?? currentDurationMinutes) * 60 * 1000,
          ).toISOString()
        : input.duration
          ? new Date(currentStart.getTime() + input.duration * 60 * 1000).toISOString()
          : existingEvent.data.end.dateTime,
    },
    attendees: input.attendees ? input.attendees.map((email) => ({ email })) : existingEvent.data.attendees,
    location: input.conferencingProvider ?? existingEvent.data.location ?? "",
  };

  await calendar.events.update({
    calendarId: "primary",
    eventId: input.eventId,
    requestBody,
  });
};

export default withGoogleAPIs(tool);
