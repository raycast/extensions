import { homedir } from "os";
import { spawn } from "child_process";
import { showHUD } from "@raycast/api";
import { getFilesInDirectory } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Hiding desktop files...");
  const desktopPath = homedir() + "/Desktop/";
  spawn("chflags", ["hidden", `${desktopPath.replaceAll(" ", `" "`)}*`], { shell: true });

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(desktopPath);
  await putFileOnHidePanel(fileSystemItems);
};
