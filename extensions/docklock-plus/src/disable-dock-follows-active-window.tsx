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
    await execAsync('open "docklockplus://disableDockFollowsActiveWindow"');
    showToast(Toast.Style.Success, "Dock follows active window disabled. The Dock will no longer follow your cursor");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to disable 'Dock follows active window'. Could not communicate with DockLock Plus",
    });
  }
}
