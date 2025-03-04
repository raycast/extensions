import { getPreferenceValues, Tool } from "@raycast/api";
import humanizeDuration from "humanize-duration";
import { withGoogleAPIs, getCalendarClient } from "../google";
import { addSignature } from "../utils";

type Input = {
  /**
   * The title/summary of the calendar event
   * @example "Team Weekly Sync" or "Meeting with John"
   */
  title: string;
  /**
   * The start date and time of the event in ISO 8601 format
   * @example "2024-03-20T15:30:00Z" or "2024-03-20T15:30:00-07:00"
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

// @ts-expect-error: Tool.Confirmation is typed internally to allow returning `undefined` values
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

  const requestBody = {
    summary: input.title,
    description: addSignature(input.description),
    start: {
      dateTime: input.startDate,
    },
    end: {
      dateTime: new Date(
        new Date(input.startDate).getTime() + (input.duration ?? parseInt(preferences.defaultEventDuration)),
      ).toISOString(),
    },
    attendees: input.attendees ? input.attendees.map((email) => ({ email })) : undefined,
  };

  const event = await calendar.events.insert({ calendarId: "primary", requestBody });

  return {
    id: event.data.id,
    link: event.data.htmlLink,
  };
};

export default withGoogleAPIs(tool);
