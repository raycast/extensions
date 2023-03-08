import { closeMainWindow, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { removeFilesFromPanel } from "./utils/hide-files-utils";
import { homedir } from "os";
import { getFocusFinderPath } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const finderPath = await getFocusFinderPath();
  const desktopPath = `${homedir()}/Desktop/`;
  if (finderPath === desktopPath) {
    await showHUD("Unhiding desktop files...");
  } else {
    await showHUD("Unhiding files in current window...");
  }
  spawn("chflags", ["nohidden", `${finderPath.replaceAll(" ", `" "`)}*`], { shell: true });

  //remove files from hide panel
  await removeFilesFromPanel(finderPath);
};
