import { showToast, Toast } from "@raycast/api";
import { isDockLockPlusInstalled } from "./utils";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

export default async function Command(): Promise<void> {
  if (!(await isDockLockPlusInstalled())) {
    await showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
    return;
  }
  try {
    await execAsync('open "docklockplus://moveDockLeft"');
    showToast(Toast.Style.Success, "The Dock was moved to the display on the left");
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to move Dock to the display on the left",
      `Could not communicate with DockLock Plus. Error: ${error}`,
    );
  }
}
