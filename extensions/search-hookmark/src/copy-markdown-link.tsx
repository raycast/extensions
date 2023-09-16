import { runAppleScriptSync } from "run-applescript";
import { showHUD } from "@raycast/api";

export default async function Command() {
  const response = runAppleScriptSync(`
  tell application "Hookmark"
        set currentBookmark to bookmark from active window
        set _name to the name of currentBookmark
        set _address to the address of currentBookmark
        set the clipboard to "[" & _name & "](" & _address & ")"
  end tell     
  return "[" & _name & "](" & _address & ")"
    `);

  await showHUD(`🎉 Successfully copy markdown link`);
}
