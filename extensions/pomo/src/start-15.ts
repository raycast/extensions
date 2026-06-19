import { closeMainWindow, showHUD, open } from "@raycast/api";
import { checkPomoInstallation } from "./utilities/checkInstall";

export default async function Command() {
  const isInstalled = await checkPomoInstallation();
  if (isInstalled) {
    await closeMainWindow();
    await open("pomo://start/15");
    await showHUD("15 min timer started");
  }
}
