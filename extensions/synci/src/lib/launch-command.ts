import { launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function launchCommandWithFeedback(options: Parameters<typeof launchCommand>[0], title: string) {
  try {
    await launchCommand(options);
  } catch (error) {
    await showFailureToast(error, { title });
  }
}
