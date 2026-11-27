import { LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// launchCommand throws when the target command is disabled or missing, so the
// failure is reported instead of the key press silently doing nothing.
export async function openCommand(name: string, title: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title });
  }
}
