import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

const COMMAND_TITLES = {
  translate: "Translate",
  "manage-providers": "Manage Providers",
} as const;

export async function openCommand(command: keyof typeof COMMAND_TITLES): Promise<void> {
  try {
    await launchCommand({ name: command, type: LaunchType.UserInitiated });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${COMMAND_TITLES[command]}`,
      message: `${error instanceof Error ? error.message : String(error)}. Check that the command is enabled in Raycast Settings.`,
    });
  }
}
