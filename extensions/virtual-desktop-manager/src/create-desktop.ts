import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { executeAhkCommand, findAhkPath } from "./lib/ahk-utils";

export default async function main() {
  const ahkPath = findAhkPath();
  if (!ahkPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AutoHotkey Not Found",
      message: "Please install AutoHotkey v2",
    });
    return;
  }

  await closeMainWindow();

  // Create desktop and switch to it
  const success = await executeAhkCommand("VD.createDesktop(true)");

  if (success) {
    await showHUD("Created new desktop");
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create desktop",
    });
  }
}
