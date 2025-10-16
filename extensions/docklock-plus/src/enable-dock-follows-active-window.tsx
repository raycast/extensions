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
    await execAsync('open "docklockplus://enableDockFollowsActiveWindow"');
    showToast(Toast.Style.Success, "Dock follows active window enabled. The Dock will now follow your active window");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to enable 'Dock Follows Active Window'. Could not communicate with DockLock Plus",
    });
  }
}
