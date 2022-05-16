import { closeMainWindow, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getFilesInDirectory, getFocusFinderPath } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";
import { homedir } from "os";

export default async () => {
  closeMainWindow({ clearRootSearch: false });
  const finderPath = await getFocusFinderPath();
  const desktopPath = `${homedir()}/Desktop/`;
  if (finderPath === desktopPath) {
    await showHUD("Hiding desktop files...");
  } else {
    await showHUD("Hiding files in current window...");
  }
  spawn("chflags", ["hidden", `${finderPath.replace(" ", `" "`)}*`], { shell: true });

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(finderPath);
  await putFileOnHidePanel(fileSystemItems);
};
