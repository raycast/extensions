import { Alert, confirmAlert } from "@raycast/api";

export type CalendarChoice = "current" | "suggested" | null;

/**
 * Safe two-stage Raycast-native calendar chooser.
 *
 * Stage 1:
 *   Primary -> add to suggested calendar
 *   Dismiss / Escape -> More Options
 *
 * Stage 2:
 *   Primary -> add to current calendar
 *   Dismiss / Escape -> return to the editable event form
 *
 * Escape therefore never creates an event.
 */
export async function chooseCalendar(
  title: string,
  currentCalendar: string,
  suggestedCalendar: string,
): Promise<CalendarChoice> {
  const useSuggested = await confirmAlert({
    title: "Choose calendar",
    message:
      `“${title}” looks like it may belong in “${suggestedCalendar}” rather than ` +
      `“${currentCalendar}”.\n\nWhich calendar should I use?`,
    primaryAction: {
      title: `Add to ${suggestedCalendar}`,
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "More Options",
    },
  });

  if (useSuggested) {
    return "suggested";
  }

  const useCurrent = await confirmAlert({
    title: "More options",
    message: `Keep “${title}” in “${currentCalendar}”, or return to the event form to edit it.`,
    primaryAction: {
      title: `Add to ${currentCalendar}`,
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Edit Event",
    },
  });

  return useCurrent ? "current" : null;
}
