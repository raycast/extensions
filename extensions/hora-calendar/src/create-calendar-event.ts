import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailure } from "./feedback";
import { quickAddEvent } from "./hora";

interface Preferences {
  calendarName?: string;
  closeWindowOnAdd: boolean;
}

export default async function Command(props: { arguments: { sentence: string } }) {
  const { calendarName, closeWindowOnAdd } = getPreferenceValues<Preferences>();

  const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to hora…" });
  try {
    const event = await quickAddEvent(props.arguments.sentence, calendarName || undefined);
    if (closeWindowOnAdd) await closeMainWindow();

    toast.style = Toast.Style.Success;
    toast.title = event.title;
    // A create that has not reached Google yet is worth saying out loud: the
    // event is real and local, but it only leaves this Mac once hora is back
    // online.
    toast.message = event.synced ? formatWhen(event) : `${formatWhen(event)} · waiting to sync`;
  } catch (error) {
    await showFailure(error, "Could not add the event");
  }
}

function formatWhen(event: { start: string; isAllDay: boolean }): string {
  const start = new Date(event.start);
  return event.isAllDay
    ? start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : start.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" });
}
