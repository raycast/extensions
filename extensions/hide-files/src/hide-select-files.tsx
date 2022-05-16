import { showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getSelectedHiddenFiles, putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  const { fileSystemItems, hiddenFiles } = await getSelectedHiddenFiles();
  if (fileSystemItems.length === 0) {
    return;
  }
  await showHUD("Hiding selected files...");
  spawn("chflags", ["hidden", hiddenFiles], { shell: true });

  //add files to hide panel
  const _fileSystemItems = fileSystemItems.map((value) => {
    return value.path;
  });
  await putFileOnHidePanel(_fileSystemItems);
};
