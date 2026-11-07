import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function openCommand(name: string, label: string, context?: { text: string }): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated, context });
  } catch (e) {
    await showFailureToast(e, { title: `Could not open ${label}` });
  }
}
