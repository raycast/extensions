import { runAppleScript } from "@raycast/utils";
import { showHUD, closeMainWindow } from "@raycast/api";
import { Account } from "./types";

/**
 * Executes the auto-fill logic.
 */
export async function performAutoFill(account: Account) {
  await closeMainWindow();

  // Wait for the window focus to switch back to the target application
  await new Promise((resolve) => setTimeout(resolve, 300));

  const script = `
    try
      set originalClipboard to the clipboard
    on error
      set originalClipboard to ""
    end try

    -- 1. Enter Username
    set the clipboard to "${account.username}"
    delay 0.1
    tell application "System Events" to keystroke "v" using {command down}
    
    -- 2. Switch to Password field
    delay 0.1
    tell application "System Events" to key code 48 -- Tab
    
    -- 3. Enter Password
    delay 0.1
    set the clipboard to "${account.password || ""}"
    delay 0.1
    tell application "System Events" to keystroke "v" using {command down}
    
    -- 4. Submit
    delay 0.2
    tell application "System Events" to key code 36 -- Enter

    delay 0.5
    set the clipboard to originalClipboard
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    await showHUD("❌ Auto-fill failed");
    console.error(error);
  }
}
