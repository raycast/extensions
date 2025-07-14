import { showToast, Toast } from "@raycast/api";
import { isDockLockPlusInstalled } from "./utils";
import { exec } from "child_process";

export default async function Command(): Promise<void> {
  if (!(await isDockLockPlusInstalled())) {
    await showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
    return;
  }
  exec('open "docklockplus://disableDockFollowsMouse"');
  await showToast(Toast.Style.Success, "Dock follows mouse disabled", "The Dock will no longer follow your cursor");
}
