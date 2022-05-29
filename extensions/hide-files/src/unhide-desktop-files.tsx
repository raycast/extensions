import { homedir } from "os";
import { spawn } from "child_process";
import { showHUD } from "@raycast/api";
import { removeFilesFromPanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Unhiding desktop files...");
  const desktopPath = homedir() + "/Desktop/";
  spawn("chflags", ["nohidden", `${desktopPath.replaceAll(" ", `" "`)}*`], { shell: true });

  //remove files from hide panel
  await removeFilesFromPanel(desktopPath);
};
