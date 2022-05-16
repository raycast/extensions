import { showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getFilesInDirectory, getFocusFinderPath } from "./utils/common-utils";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Hiding files in current window...");
  const finderPath = await getFocusFinderPath();
  spawn("chflags", ["hidden", `${finderPath.replace(" ", `" "`)}*`], { shell: true });

  //add files to hide panel
  const fileSystemItems = getFilesInDirectory(finderPath);
  await putFileOnHidePanel(fileSystemItems);
};
