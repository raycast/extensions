import { getPreferenceValues, Tool } from "@raycast/api";
import humanizeDuration from "humanize-duration";
import { withGoogleAPIs, getCalendarClient } from "../lib/google";
import { addSignature, toISO8601WithTimezoneOffset } from "../lib/utils";
import { parseISO, addMinutes } from "date-fns";
import { calendar_v3 } from "@googleapis/calendar";
import { nanoid } from "nanoid";
type Input = {
  /**
   * The title/summary of the calendar event
   * @example "Team Weekly Sync" or "Meeting with John"
   */
  title: string;
  /**
   * The start date and time of the event in ISO 8601 format with timezone offset
   * @example "2024-03-20T15:30:00-07:00" or "2024-03-20T15:30:00+02:00"
   * @remarks For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC)
   */
  startDate: string;
  /**
   * The duration of the event in minutes
   * @example 30 for a 30-minute meeting, 60 for a 1-hour meeting
   * @remarks If not provided, the event will use the user's default event duration
   */
  duration?: number;
  /**
   * List of email addresses for event attendees
   * @example ["john@example.com", "jane@example.com"]
   * @remarks The current user will automatically be added as the event organizer
   */
  attendees?: string[];
  /**
   * Detailed description or agenda for the event
   * @example "Monthly review of project progress and key metrics discussion"
   * @remarks Only use for additional information, don't duplicate the even title. Useful to add external conference links like Zoom.
   */
  description?: string;
  /**
   * Whether to add a Google Meet link to the event
   * @example "with digital conference link"
   * @defaults false
   * @remarks If enabled, a Google Meet link will be added to the event. The link will be included in the event details and can be used to join the meeting.
   */
  addGoogleMeetLink?: boolean;
  /**
   * The ID of the calendar to create the event in
   * @example "primary" or "email@abstract...com"
   * @default "primary"
   * @remarks If not provided, the event will be created in the user's primary calendar. The calendar ID can be found using the `list-calendars` tool.
   */
  calendarId?: string;
};

const preferences: ExtensionPreferences = getPreferenceValues();

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.attendees) {
    return;
  }

  return {
    message: "Are you sure you want to create an event with the following details?",
    info: [
      { name: "Title", value: input.title },
      { name: "Start", value: new Date(input.startDate).toLocaleString() },
      {
        name: "Duration",
        value: humanizeDuration((input.duration ?? parseInt(preferences.defaultEventDuration)) * 60 * 1000),
      },
      { name: "Attendees", value: input.attendees?.join(", ") },
      { name: "Description", value: input.description },
      { name: "Add Google Meet Link", value: input.addGoogleMeetLink ? "Yes" : "No" },
    ],
  };
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();

  const startDate = parseISO(input.startDate);
  const endDate = addMinutes(startDate, input.duration ?? parseInt(preferences.defaultEventDuration));

  const requestBody: calendar_v3.Schema$Event = {
    summary: input.title,
    description: addSignature(input.description),
    start: {
      dateTime: toISO8601WithTimezoneOffset(startDate),
    },
    end: {
      dateTime: toISO8601WithTimezoneOffset(endDate),
    },
    attendees: input.attendees ? input.attendees.map((email) => ({ email })) : undefined,
    conferenceData: input.addGoogleMeetLink
      ? {
          createRequest: {
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
            requestId: nanoid(),
          },
        }
      : undefined,
  };

  try {
    const event = await calendar.events.insert({
      calendarId: input.calendarId || "primary",
      requestBody,
      conferenceDataVersion: input.addGoogleMeetLink ? 1 : undefined,
    });
    return {
      id: event.data.id,
      link: event.data.htmlLink,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create event");
  }
};

export default withGoogleAPIs(tool);
