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

  const success = await executeAhkCommand("VD.goToRelativeDesktopNum(-1)");

  if (success) {
    await showHUD("Switched to previous desktop");
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to switch desktop",
    });
  }
}
