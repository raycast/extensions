import {
  Alert,
  LaunchProps,
  LaunchType,
  confirmAlert,
  launchCommand,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteEvent } from "./lib/google";
import { GoogleCalendarEntry, GoogleEvent } from "./lib/types";

type DeleteEventLaunchContext = {
  calendar?: GoogleCalendarEntry;
  event?: GoogleEvent;
};

type DeleteEventLaunchProps = LaunchProps<{
  launchContext: DeleteEventLaunchContext;
}>;

function titleFor(event: GoogleEvent): string {
  return event.summary?.trim() || "Untitled Event";
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
    });
  } catch {
    // The menu bar may be disabled. Deleting the event should still succeed.
  }
}

export default async function Command(props: DeleteEventLaunchProps) {
  const calendar = props.launchContext?.calendar;
  const event = props.launchContext?.event;

  if (!calendar || !event) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No event selected",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Delete “${titleFor(event)}”?`,
    message: event.recurringEventId
      ? "This deletes this occurrence from Google Calendar."
      : "This removes the event from Google Calendar.",
    primaryAction: {
      title: "Delete Event",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
    },
  });

  if (!confirmed) return;

  try {
    await deleteEvent(calendar.id, event.id);
    await refreshMenuBar();
    await showHUD("Event deleted");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not delete event",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
