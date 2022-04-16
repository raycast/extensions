import { FileSystemItem, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { fetchSelectedFileSystemItem } from "./utils/common-utils";
import { parse } from "path";
import { putFileOnHidePanel } from "./utils/hide-files-utils";

export default async () => {
  try {
    const fileSystemItems: FileSystemItem[] = await fetchSelectedFileSystemItem();
    if (fileSystemItems.length === 0) {
      await showHUD("No files selected");
      return;
    }
    let hiddenFiles = "";
    fileSystemItems.forEach((value) => {
      const parsedPath = parse(value.path);
      hiddenFiles = hiddenFiles + " " + parsedPath.dir.replace(" ", `" "`) + "/" + parsedPath.base.replace(" ", `" "`);
    });
    await showHUD("Selected files hidden");
    const hideDesktopFilesCommand = `chflags hidden ${hiddenFiles}`;
    exec(hideDesktopFilesCommand);

    //add files to hide panel
    const _fileSystemItems = fileSystemItems.map((value) => {
      return value.path;
    });
    await putFileOnHidePanel(_fileSystemItems);
  } catch (e) {
    await showHUD("Could not get the selected Finder items");
    console.error(String(e));
  }
};
