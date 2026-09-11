import { getPreferenceValues } from "@raycast/api";
import { getNotificationLevel, serializeEvent } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Google Calendar event ID, usually obtained from search-events or get-event. */
  eventId: string;
  /** Calendar currently containing the event. Defaults to "primary". */
  sourceCalendarId?: string;
  /** Destination calendar ID from list-calendars. Moving changes the event organizer. */
  destinationCalendarId: string;
  /** Guest notification level. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
};

async function getSourceEvent(input: Input) {
  const calendarId = input.sourceCalendarId ?? "primary";
  const response = await getCalendarClient().events.get({ calendarId, eventId: input.eventId });
  if (response.data.eventType && response.data.eventType !== "default") {
    throw new Error(`Google only supports moving default events; this is a "${response.data.eventType}" event.`);
  }
  return response.data;
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const event = await getSourceEvent(input);
  return {
    message: "Move this event to another calendar and change its organizer?",
    info: [
      { name: "Event", value: event.summary ?? "Untitled Event" },
      { name: "From", value: input.sourceCalendarId ?? "primary" },
      { name: "To", value: input.destinationCalendarId },
    ],
  };
});

const tool = async (input: Input) => {
  const preferences = getPreferenceValues<Preferences>();
  await getSourceEvent(input);
  const response = await getCalendarClient().events.move({
    calendarId: input.sourceCalendarId ?? "primary",
    destination: input.destinationCalendarId,
    eventId: input.eventId,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
  });
  return serializeEvent(response.data, input.destinationCalendarId);
};

export default withGoogleAPIs(tool);
