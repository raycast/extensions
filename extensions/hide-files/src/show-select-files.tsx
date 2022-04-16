import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { getSelectedHiddenFiles, removeFilesFromPanelBySelected } from "./utils/hide-files-utils";

export default async () => {
  try {
    const { fileSystemItems, hiddenFiles } = await getSelectedHiddenFiles();
    if (fileSystemItems.length === 0) {
      return;
    }
    await showHUD("Selected files are shown");
    const hideDesktopFilesCommand = `chflags nohidden ${hiddenFiles}`;
    exec(hideDesktopFilesCommand);

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
