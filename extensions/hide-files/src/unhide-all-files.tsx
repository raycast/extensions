import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { getFocusFinderPath } from "./utils/common-utils";
import { removeFilesFromPanel } from "./utils/hide-files-utils";

export default async () => {
  await showHUD("Unhidden Current window files");
  const finderPath = await getFocusFinderPath();
  const hideDesktopFilesCommand = `chflags nohidden ${finderPath.replace(" ", `" "`)}*`;
  exec(hideDesktopFilesCommand);

  //remove files from hide panel
  await removeFilesFromPanel(finderPath);
};
