import { showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getFilesInDirectory, getFocusFinderPath } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Hidden current window files");
  const finderPath = await getFocusFinderPath();
  const hideDesktopFilesCommand = `chflags hidden ${finderPath.replace(" ", `" "`)}*`;
  spawn(hideDesktopFilesCommand, { shell: true });

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(finderPath);
  await putFileOnHidePanel(fileSystemItems);
};
