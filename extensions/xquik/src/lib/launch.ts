import { launchCommand, LaunchType, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const COMMAND_TITLES = {
  "view-monitor-events": "View Monitor Events",
  "manage-monitors": "Manage Monitors",
} as const;

export type XquikCommand = keyof typeof COMMAND_TITLES;

// launchCommand throws when the user has turned the command off in Raycast Settings.
export async function launchXquikCommand(name: XquikCommand) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, {
      title: `Could Not Open ${COMMAND_TITLES[name]}`,
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
  }
}
