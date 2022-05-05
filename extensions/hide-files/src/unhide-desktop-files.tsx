import { homedir } from "os";
import { spawn } from "child_process";
import { showHUD } from "@raycast/api";
import { removeFilesFromPanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Unhidden desktop files");
  const desktopPath = homedir() + "/Desktop/";
  const hideDesktopFilesCommand = `chflags nohidden ${desktopPath.replace(" ", `" "`)}*`;
  spawn(hideDesktopFilesCommand, { shell: true });

  //remove files from hide panel
  await removeFilesFromPanel(desktopPath);
};
