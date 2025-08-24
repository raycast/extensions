import { showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { isDockLockPlusInstalled } from "./utils";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

export default async function Command(): Promise<void> {
  if (!(await isDockLockPlusInstalled())) {
    await showFailureToast("", { title: "DockLock Plus not installed. Install it at https://docklockpro.com" });
    return;
  }
  try {
    await execAsync('open "docklockplus://moveDockDown"');
    showToast(Toast.Style.Success, "The Dock was moved to the display below");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to move Dock down. Could not communicate with DockLock Plus" });
  }
}
