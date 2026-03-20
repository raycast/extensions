import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const APPLE_SCRIPT = `
on run argv
  if (count of argv) is 0 then return

  set textToType to item 1 of argv
  set allParagraphs to paragraphs of textToType
  set paragraphCount to count of allParagraphs

  tell application "System Events"
    repeat with i from 1 to paragraphCount
      keystroke item i of allParagraphs
      if i is less than paragraphCount then key code 36
    end repeat
  end tell
end run
`;

export default async function command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showHUD("Clipboard is empty");
    return;
  }

  await closeMainWindow();

  try {
    await execFileAsync("osascript", ["-e", APPLE_SCRIPT, clipboardText]);
    await showHUD("Typed clipboard text");
  } catch {
    await showHUD("Typing failed. Enable Accessibility for Raycast.");
  }
}
