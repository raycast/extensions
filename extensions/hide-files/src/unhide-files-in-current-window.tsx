import { closeMainWindow, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getFocusFinderPath } from "./utils/common-utils";
import { removeFilesFromPanel } from "./utils/hide-files-utils";
import { homedir } from "os";

export default async () => {
  closeMainWindow({ clearRootSearch: false });
  const finderPath = await getFocusFinderPath();
  const desktopPath = `${homedir()}/Desktop/`;
  if (finderPath === desktopPath) {
    await showHUD("Unhiding desktop files...");
  } else {
    await showHUD("Unhiding files in current window...");
  }
  spawn("chflags", ["nohidden", `${finderPath.replace(" ", `" "`)}*`], { shell: true });

  //remove files from hide panel
  await removeFilesFromPanel(finderPath);
};
