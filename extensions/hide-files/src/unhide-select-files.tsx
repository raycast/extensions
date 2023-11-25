import { showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { getSelectedHiddenFiles, removeFilesFromPanelBySelected } from "./utils/hide-files-utils";

export default async () => {
  try {
    const { fileSystemItems, hiddenFiles } = await getSelectedHiddenFiles();
    if (fileSystemItems.length === 0) {
      return;
    }
    await showHUD("Unhiding selected files...");
    spawn("chflags", ["nohidden", `${hiddenFiles}`], { shell: true });

    //add files to hide panel
    const _fileSystemItems = fileSystemItems.map((value) => {
      return value.path;
    });
    await removeFilesFromPanelBySelected(_fileSystemItems);
  } catch (e) {
    await showHUD("Could not get the selected Finder items");
    console.error(String(e));
  }
};
