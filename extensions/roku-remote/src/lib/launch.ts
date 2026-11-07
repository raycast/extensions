import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** Opens another command of this extension and reports failures, for example when it is disabled. */
export async function openCommand(name: string): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open command" });
  }
}
