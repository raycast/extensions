import { Toast, showToast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LaunchProps } from "@raycast/api";
import { parseEventDetails } from "./services/llm";
import { createGoogleCalendarEvent } from "./services/calendar";
import { authorize } from "./utils/oauth";
import { CreateEventArguments, CreateEventPreferences } from "./types";

export default async function CreateEvent(props: LaunchProps<{ arguments: CreateEventArguments }>): Promise<void> {
  const preferences = getPreferenceValues<CreateEventPreferences>();
  const token: string = await authorize();
  const eventDetails: string = props.arguments.eventDetails;
  const color: string = props.arguments.color ?? preferences.defaultColor ?? "11";

  const selectedCalendar = await LocalStorage.getItem<string>("defaultCalendar");
  const finalPreferences = {
    ...preferences,
    defaultCalendar: selectedCalendar || preferences.defaultCalendar,
  };

  try {
    await showToast({ style: Toast.Style.Animated, title: "Creating Event..." });
    const parsed = await parseEventDetails(eventDetails, {
      includeDescription: preferences.includeDescription,
      defaultDuration: preferences.defaultDuration,
    });

    const event = await createGoogleCalendarEvent(token, parsed, color, finalPreferences);

    await showToast({
      style: Toast.Style.Success,
      title: `Event Created: ${event.summary}`,
      message: event.start?.dateTime ?? "",
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to create event" });
  }
}
