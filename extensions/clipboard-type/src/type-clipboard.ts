import { Clipboard, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showFailureToast("Clipboard is empty");
    return;
  }
  await closeMainWindow();
  const { delay: delayStr } = getPreferenceValues<Preferences>();
  const delay = Number.parseFloat(delayStr); // Delay between keystrokes in seconds

  const appleScriptContent = `
set delaySeconds to ${delay}
set theText to the clipboard as text
delay 0.2
tell application "System Events"
  repeat with ch in characters of theText
    set c to contents of ch
    if c is return or c is linefeed then
      key code 36
    else if c is tab then
      key code 48
    else
      keystroke c
    end if
    delay delaySeconds
  end repeat
end tell
`;

  // Execute the AppleScript using osascript directly
  try {
    await runAppleScript(appleScriptContent);
  } catch (error) {
    await showFailureToast(error);
  }
}
