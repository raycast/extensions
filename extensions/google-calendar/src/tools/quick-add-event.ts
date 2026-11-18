import { getPreferenceValues, Tool } from "@raycast/api";
import { getNotificationLevel, serializeEvent } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /**
   * Natural-language event text understood by Google Calendar, such as
   * "Dinner with Alex tomorrow at 7pm for 2 hours".
   */
  text: string;
  /** Calendar in which to create the event. Defaults to "primary". */
  calendarId?: string;
  /** Guest notification level. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Let Google Calendar parse this text and create an event?",
  info: [
    { name: "Calendar", value: input.calendarId ?? "primary" },
    { name: "Event Text", value: input.text },
  ],
});

const tool = async (input: Input) => {
  if (!input.text.trim()) throw new Error("text cannot be empty.");
  const preferences = getPreferenceValues<Preferences>();
  const calendarId = input.calendarId ?? "primary";
  const response = await getCalendarClient().events.quickAdd({
    calendarId,
    text: input.text,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
  });
  return serializeEvent(response.data, calendarId);
};

export default withGoogleAPIs(tool);
