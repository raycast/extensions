import { homedir } from "os";
import { exec } from "child_process";
import { showHUD } from "@raycast/api";
import { removeFilesFromPanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Desktop files shown");
  const desktopPath = homedir() + "/Desktop/";
  const hideDesktopFilesCommand = `chflags nohidden ${desktopPath.replace(" ", `" "`)}*`;
  exec(hideDesktopFilesCommand);

  //remove files from hide panel
  await removeFilesFromPanel(desktopPath);
};
