import { Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";
import { setTimeout } from "timers/promises";
import { testPermissionErrorType, showPermissionErrorHUD } from "./errors";

export default async (props: LaunchProps) => {
  const fallingBack = !!props.fallbackText && props.fallbackText.length > 0;
  let currentClipboardContent: string | undefined;

  // Copy the fallback text to the clipboard if it exists
  if (fallingBack) {
    // Save the current clipboard content if possible
    currentClipboardContent = await Clipboard.readText();
    await Clipboard.copy(props.fallbackText ?? "");
  }

  await closeMainWindow();

  try {
    runAppleScriptSync(`
    tell application "Notes" to activate
    tell application "System Events" to keystroke "0" using command down
    tell application "System Events" to tell process "Notes" to ¬
    click menu item 1 of menu 1 of ¬
    menu bar item 3 of menu bar 1
  `);

    if (fallingBack) {
      runAppleScriptSync(`
      tell application "System Events" to keystroke "v" using command down
    `);
    }
  } catch (error) {
    showPermissionErrorHUD(testPermissionErrorType(error));
  }

  // Simply give it a break before restoring the clipboard
  await setTimeout(200);
  Clipboard.copy(currentClipboardContent ?? "");
};
