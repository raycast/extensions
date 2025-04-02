import { Action } from "@raycast/api";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /**
   * The ID of the event to delete.
   */
  eventId: string;
  /**
   * The ID of the calendar where the event is located.
   * @default "primary"
   * @remarks If not provided, the event will be deleted from the user's primary calendar. The calendar ID can be found using the `list-calendars` tool.
   */
  calendarId?: string;
};

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const calendar = getCalendarClient();
  const event = await calendar.events.get({ calendarId: input.calendarId ?? "primary", eventId: input.eventId });
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete this event?",
    info: [{ name: "Event", value: event.data.summary }],
  };
});

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: input.calendarId ?? "primary", eventId: input.eventId });
};

export default withGoogleAPIs(tool);
