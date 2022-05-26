import { closeMainWindow, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getFilesInDirectory } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";
import { homedir } from "os";
import { getFocusFinderPath } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const finderPath = await getFocusFinderPath();
  const desktopPath = `${homedir()}/Desktop/`;
  if (finderPath === desktopPath) {
    await showHUD("Hiding desktop files...");
  } else {
    await showHUD("Hiding files in current window...");
  }
  spawn("chflags", ["hidden", `${finderPath.replaceAll(" ", `" "`)}*`], { shell: true });

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(finderPath);
  await putFileOnHidePanel(fileSystemItems);
};
