import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { getFilesInDirectory, getFocusFinderPath } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

/**
 *
 *@user koinzhang
 *@email koinzhang@gmail.com
 *@date 2022-04-21
 *
 **/
export default async () => {
  await showHUD("Current window files are hidden");
  const finderPath = await getFocusFinderPath();
  const hideDesktopFilesCommand = `chflags hidden ${finderPath.replace(" ", `" "`)}*`;
  exec(hideDesktopFilesCommand);

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(finderPath);
  await putFileOnHidePanel(fileSystemItems);
};
