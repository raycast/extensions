import { Clipboard, closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import { isFinderFrontmost, getCurrentFinderDirectory, selectInFinder, generateUniqueName } from "./common/finder";
import { fsAsync } from "./common/fs-async";

export default async function CreateTextFile(props: LaunchProps<{ arguments: Arguments.CreateTextFile }>) {
  const rawExt = props.arguments.extension?.trim() || "txt";
  // strip leading dot if user typed ".md" instead of "md"
  const extension = rawExt.replace(/^\./, "");

  const frontmost = await isFinderFrontmost();
  if (!frontmost) {
    await showHUD("Finder is not the active application");
    return;
  }

  const targetDir = await getCurrentFinderDirectory();

  // read clipboard text if available
  let content = "";
  let usedClipboard = false;
  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText && clipboardText.trim().length > 0) {
      content = clipboardText;
      usedClipboard = true;
    }
  } catch {
    // clipboard read failed, create empty file
  }

  // generate unique filename
  const uniqueName = await generateUniqueName(targetDir, "untitled", extension);
  const filePath = path.join(targetDir, uniqueName);

  // write the file
  const result = await fsAsync.writeFile(filePath, content);
  if (!result.success) {
    await showHUD(`Failed to create file: ${result.error?.message || "unknown error"}`);
    return;
  }

  if (usedClipboard) {
    await showHUD(`Created "${uniqueName}" with clipboard content`);
  } else {
    await showHUD(`Created "${uniqueName}"`);
  }

  await selectInFinder(filePath);
  await closeMainWindow();
}
