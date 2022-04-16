import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { getSelectedHiddenFiles, putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  const { fileSystemItems, hiddenFiles } = await getSelectedHiddenFiles();
  if (fileSystemItems.length === 0) {
    return;
  }
  await showHUD("Selected files are hidden");
  const hideDesktopFilesCommand = `chflags hidden ${hiddenFiles}`;
  exec(hideDesktopFilesCommand);

  //add files to hide panel
  const _fileSystemItems = fileSystemItems.map((value) => {
    return value.path;
  });
  await putFileOnHidePanel(_fileSystemItems);
};
