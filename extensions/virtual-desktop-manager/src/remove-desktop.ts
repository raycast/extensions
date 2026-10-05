import { closeMainWindow, showHUD, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
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

  // Confirm before removing
  const confirmed = await confirmAlert({
    title: "Remove Current Desktop?",
    message: "Windows on this desktop will be moved to the previous desktop.",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  await closeMainWindow();

  const success = await executeAhkCommand("VD.removeDesktop(VD.getCurrentDesktopNum())");

  if (success) {
    await showHUD("Desktop removed");
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove desktop",
      message: "Cannot remove the last desktop",
    });
  }
}
