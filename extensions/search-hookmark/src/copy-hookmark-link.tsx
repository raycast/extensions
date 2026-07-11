import { runAppleScriptSync } from "run-applescript";
import { showHUD } from "@raycast/api";

export default async function Command() {
  const response = runAppleScriptSync(`
  tell application "Hookmark"
        set currentBookmark to bookmark from active window
        set _address to the address of currentBookmark
        set the clipboard to _address
  end tell     
  return _address
    `);

  await showHUD(`🎉 Successfully copy link: ${response}`);
}
