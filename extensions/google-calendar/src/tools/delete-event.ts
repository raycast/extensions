import { Action, getPreferenceValues } from "@raycast/api";
import { getNotificationLevel } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Event ID from search-events or get-event. An instance ID deletes only that occurrence; a series ID deletes the series. */
  eventId: string;
  /** Calendar containing the event. Defaults to "primary". */
  calendarId?: string;
  /** Guest notification level. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
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
  const preferences = getPreferenceValues<Preferences>();
  const calendar = getCalendarClient();
  const calendarId = input.calendarId ?? "primary";
  const event = await calendar.events.get({ calendarId, eventId: input.eventId });
  await calendar.events.delete({
    calendarId,
    eventId: input.eventId,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
  });
  return {
    deleted: true,
    id: input.eventId,
    calendarId,
    title: event.data.summary,
    recurringEventId: event.data.recurringEventId,
  };
};

export default withGoogleAPIs(tool);
