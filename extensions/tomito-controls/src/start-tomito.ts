import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkTomitoInstallation } from "./utilities/checkInstall";
import { syncFocus } from "./utilities/syncFocus";

export default async () => {
  const isInstalled = await checkTomitoInstallation();

  if (isInstalled) {
    await closeMainWindow();
    await runAppleScript('tell application "Tomito" to start');
    await syncFocus("enable");
  }
};
