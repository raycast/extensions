import { Application, closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);

export async function launchNewInstance(application: Application) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Launching new instance of ${application.name}...`,
    });

    // Use shell to execute open -n command for new instance
    await execAsync(`open -n "${application.path}"`);

    await showToast({
      style: Toast.Style.Success,
      title: `Launched new instance of ${application.name}`,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to launch application" });
  } finally {
    await closeMainWindow({ clearRootSearch: true });
  }
}
