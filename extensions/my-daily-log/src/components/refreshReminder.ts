import { launchCommand, LaunchType } from "@raycast/api";

/** Refreshes the "Log Reminder" menu bar item (if enabled) right after the logs change. */
export async function refreshReminder() {
  try {
    await launchCommand({ name: "logReminderMenuBar", type: LaunchType.Background });
  } catch {
    // The menu bar command is not enabled.
  }
}
