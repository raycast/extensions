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
    await execAsync('open "docklockplus://enableDockLock"');
    showToast(Toast.Style.Success, "DockLock enabled. The DockLock engine has been started");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to enable DockLock. Could not communicate with DockLock Plus" });
  }
}
