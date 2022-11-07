import { Clipboard, getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  const selectedText = await getSelectedText();

  await runAppleScript(`
    tell application "Smultron"
      if it is not running then launch
      set frontmost to true
      activate
    end tell

    tell application "System Events" to tell process "Smultron"
      click menu item "New" of menu 1 of menu bar item "File" of menu bar 1
    end tell
`);

  await Clipboard.paste(selectedText);
}
