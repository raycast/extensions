import { Application, closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

export async function launchNewInstance(application: Application) {
  try {
    await closeMainWindow({ clearRootSearch: true });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Launching new instance of ${application.name}...`,
    });

    await execFileAsync("open", ["-n", application.path]);

    toast.style = Toast.Style.Success;
    toast.title = `Launched new instance of ${application.name}`;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to launch application" });
  }
}
