import { closeMainWindow, showHUD, open } from "@raycast/api";
import { checkPomoInstallation } from "./utilities/checkInstall";

export default async function Command() {
  const isInstalled = await checkPomoInstallation();
  if (isInstalled) {
    await closeMainWindow();
    await open("pomo://start/5");
    await showHUD("5 min timer started");
  }
}
