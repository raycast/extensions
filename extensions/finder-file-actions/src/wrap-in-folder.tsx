import { closeMainWindow, getSelectedFinderItems, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import { isFinderFrontmost, selectInFinder, generateUniqueName } from "./common/finder";
import { fsAsync } from "./common/fs-async";

export default async function WrapInFolder(props: LaunchProps<{ arguments: Arguments.WrapInFolder }>) {
  const folderName = props.arguments.folderName?.trim() || "untitled folder";

  const frontmost = await isFinderFrontmost();
  if (!frontmost) {
    await showHUD("Finder is not the active application");
    return;
  }

  // get selected files - required for this command
  let selectedFiles: string[] = [];
  try {
    const items = await getSelectedFinderItems();
    selectedFiles = items.map((item) => item.path);
  } catch {
    // no selection
  }

  if (selectedFiles.length === 0) {
    await showHUD("No files selected in Finder");
    return;
  }

  // create folder in the same directory as the selected files
  const targetDir = path.dirname(selectedFiles[0]);
  const uniqueName = await generateUniqueName(targetDir, folderName);
  const newFolderPath = path.join(targetDir, uniqueName);

  const result = await fsAsync.createDirectory(newFolderPath);
  if (!result.success) {
    await showHUD(`Failed to create folder: ${result.error?.message || "unknown error"}`);
    return;
  }

  // move selected files into the new folder
  let failCount = 0;
  for (const filePath of selectedFiles) {
    const destPath = path.join(newFolderPath, path.basename(filePath));
    const moveResult = await fsAsync.moveFile(filePath, destPath);
    if (!moveResult.success) {
      failCount++;
      console.error(`Failed to move ${filePath}: ${moveResult.error?.message}`);
    }
  }

  if (failCount > 0) {
    await showHUD(`Created "${uniqueName}" but ${failCount} file(s) failed to move`);
  } else {
    await showHUD(`Created "${uniqueName}" with ${selectedFiles.length} file(s)`);
  }

  await selectInFinder(newFolderPath);
  await closeMainWindow();
}
