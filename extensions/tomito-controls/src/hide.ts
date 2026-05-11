import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkTomitoInstallation } from "./utilities/checkInstall";

export default async () => {
  const isInstalled = await checkTomitoInstallation();

  if (isInstalled) {
    await closeMainWindow();
    await runAppleScript('tell application "Tomito" to hide');
  }
};
