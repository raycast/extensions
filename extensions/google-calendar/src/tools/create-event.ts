import { getPreferenceValues, Tool } from "@raycast/api";
import humanizeDuration from "humanize-duration";
import { withGoogleAPIs, getCalendarClient } from "../google";
import { addSignature, toISO8601WithTimezoneOffset } from "../utils";
import { parseISO, addMinutes } from "date-fns";

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
   */
  description?: string;
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
    ],
  };
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();

  const startDate = parseISO(input.startDate);
  console.log(startDate);
  const endDate = addMinutes(startDate, input.duration ?? parseInt(preferences.defaultEventDuration));

  const requestBody = {
    summary: input.title,
    description: addSignature(input.description),
    start: {
      dateTime: toISO8601WithTimezoneOffset(startDate),
    },
    end: {
      dateTime: toISO8601WithTimezoneOffset(endDate),
    },
    attendees: input.attendees ? input.attendees.map((email) => ({ email })) : undefined,
  };

  try {
    const event = await calendar.events.insert({ calendarId: "primary", requestBody });
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
