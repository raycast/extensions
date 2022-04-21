import { homedir } from "os";
import { exec } from "child_process";
import { showHUD } from "@raycast/api";
import { getFilesInDirectory } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

/**
 *
 *@user koinzhang
 *@email koinzhang@gmail.com
 *@date 2022-04-21
 *
 **/
export default async () => {
  await showHUD("Desktop files are hidden");
  const desktopPath = homedir() + "/Desktop/";
  const hideDesktopFilesCommand = `chflags hidden ${desktopPath.replace(" ", `" "`)}*`;
  exec(hideDesktopFilesCommand);

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(desktopPath);
  await putFileOnHidePanel(fileSystemItems);
};
