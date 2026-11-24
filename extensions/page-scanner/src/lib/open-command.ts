/**
 * One command opening the other: Set Up's Scan Current Tab action, and the Set Up action on Scan
 * Current Tab's failure toasts.
 */
import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** `launchCommand` throws when the user has turned the other command off in Raycast's settings. */
export async function openCommand(name: "scan-current-tab" | "set-up", failureTitle: string): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}
