import { showHUD, showToast, Toast } from "@raycast/api";
import { findAhkPath, isKeybindingsRunning, launchKeybindingsScript, reloadKeybindingsScript } from "./lib/ahk-utils";

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

  const isRunning = await isKeybindingsRunning();

  if (isRunning) {
    const reloaded = await reloadKeybindingsScript();
    if (reloaded) {
      await showHUD("Keybindings daemon reloaded");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reload daemon",
      });
    }
  } else {
    const launched = await launchKeybindingsScript();
    if (launched) {
      await showHUD("Keybindings daemon started");
    }
  }
}
