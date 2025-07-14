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
    await execAsync('open "docklockplus://disableDockLock"');
    showToast(Toast.Style.Success, "DockLock disabled. The DockLock engine has been stopped");
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to disable DockLock",
      `Could not communicate with DockLock Plus. Error: ${error}`,
    );
  }
}
