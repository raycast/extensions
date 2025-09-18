import { Toast, showToast, getPreferenceValues, LocalStorage, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LaunchProps } from "@raycast/api";
import { parseEventDetails } from "./services/llm";
import { createGoogleCalendarEvent } from "./services/calendar";
import { withGoogleAPIs } from "./utils/oauth";
import { CreateEventArguments, CreateEventPreferences } from "./types";

async function CreateEventImpl(props: LaunchProps<{ arguments: CreateEventArguments }>): Promise<void> {
  const preferences = getPreferenceValues<CreateEventPreferences>();
  const eventDetails: string = props.arguments.eventDetails;
  const color: string | null = preferences.defaultColor == "0" ? null : preferences.defaultColor;

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

    const event = await createGoogleCalendarEvent(parsed, color, finalPreferences);

    await showToast({
      style: Toast.Style.Success,
      title: `Event Created: ${event.summary}`,
      primaryAction: {
        title: "View Event",
        onAction: () => {
          if (event.htmlLink) {
            open(event.htmlLink);
          }
        },
      },
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to create event" });
  }
}

export default withGoogleAPIs(CreateEventImpl);
