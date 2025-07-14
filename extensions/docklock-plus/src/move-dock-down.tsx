import { showToast, Toast } from "@raycast/api";
import { isDockLockPlusInstalled } from "./utils";
import { exec } from "child_process";

export default async function Command(): Promise<void> {
  if (!(await isDockLockPlusInstalled())) {
    await showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
    return;
  }
  exec('open "docklockplus://moveDockDown"');
  await showToast(Toast.Style.Success, "Dock moved down", "The Dock was moved to the display below");
}
