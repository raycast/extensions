import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import { isFinderFrontmost, getCurrentFinderDirectory, selectInFinder, generateUniqueName } from "./common/finder";
import { fsAsync } from "./common/fs-async";

export default async function CreateFolder(props: LaunchProps<{ arguments: Arguments.CreateFolder }>) {
  const folderName = props.arguments.folderName?.trim() || "untitled folder";

  const frontmost = await isFinderFrontmost();
  if (!frontmost) {
    await showHUD("Finder is not the active application");
    return;
  }

  const targetDir = await getCurrentFinderDirectory();
  const uniqueName = await generateUniqueName(targetDir, folderName);
  const newFolderPath = path.join(targetDir, uniqueName);

  const result = await fsAsync.createDirectory(newFolderPath);
  if (!result.success) {
    await showHUD(`Failed to create folder: ${result.error?.message || "unknown error"}`);
    return;
  }

  await showHUD(`Created "${uniqueName}"`);
  await selectInFinder(newFolderPath);
  await closeMainWindow();
}
