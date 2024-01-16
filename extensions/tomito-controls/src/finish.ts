import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkTomitoInstallation } from "./utilities/checkInstall";

export default async () => {
  const isInstalled = await checkTomitoInstallation();

  if (isInstalled) {
    await closeMainWindow();

    // If "Manually finish sessions and breaks" is selected,
    // and the current interval has run over time,
    // 'start' is the only AppleScript command that mimics
    // clicking the "Finish" button
    await runAppleScript('tell application "Tomito" to start');
  }
};
