import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  const text = await Clipboard.readText();

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  await closeMainWindow();

  const appleScript = `
    tell application "System Events"
      set theText to the clipboard
      repeat with char in theText
        keystroke char
        delay 0.0001
      end repeat
    end tell
  `;

  exec(`osascript -e '${appleScript}'`, (error) => {
    if (error) {
      console.error("AppleScript failed:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Typing failed",
        message: "Check Accessibility permissions.",
      });
    }
  });
}
