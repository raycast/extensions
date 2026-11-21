import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** Launches another command of this extension, reporting failures (for example, a disabled command). */
export async function launch(name: "connect" | "assignments") {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open command" });
  }
}
