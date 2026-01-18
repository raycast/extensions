import { getPreferenceValues, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(_exec);

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const traeAppPath = prefs.traeApp?.path || "/Applications/Trae.app";
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Trae…" });
  try {
    const scriptKeystroke = `tell application "${traeAppPath}" to activate
tell application "System Events" to keystroke "n" using {command down, shift down}`;
    try {
      await runAppleScript(scriptKeystroke);
    } catch {
      const scriptMenu = `tell application "${traeAppPath}" to activate
tell application "System Events"
  tell application process "Trae"
    set frontmost to true
    try
      click menu item "New Window" of menu "File" of menu bar 1
    on error
      click menu item "New" of menu "File" of menu bar 1
    end try
  end tell
end tell`;
      try {
        await runAppleScript(scriptMenu);
      } catch {
        await exec(`open -n -a "${traeAppPath}" --args --new-window`);
      }
    }
    try {
      const scriptCloseWorkspaceMenu = `tell application "${traeAppPath}" to activate
tell application "System Events"
  tell application process "Trae"
    set frontmost to true
    try
      click menu item "Close Workspace" of menu "File" of menu bar 1
    on error
      click menu item "Close Folder" of menu "File" of menu bar 1
    end try
  end tell
end tell`;
      try {
        await runAppleScript(scriptCloseWorkspaceMenu);
      } catch {
        const scriptCloseWindow = `tell application "${traeAppPath}" to activate
tell application "System Events"
  keystroke "w" using {command down}
end tell`;
        await runAppleScript(scriptCloseWindow);
        const scriptReopenNew = `tell application "${traeAppPath}" to activate
tell application "System Events" to keystroke "n" using {command down, shift down}`;
        await runAppleScript(scriptReopenNew);
      }
    } catch {
      // ignore
    }
    toast.style = Toast.Style.Success;
    toast.title = "New window opened";
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open new window";
    toast.message =
      error instanceof Error
        ? error.message
        : "Try enabling Accessibility permission for Raycast or check your Trae app selection in preferences.";
  }
}
