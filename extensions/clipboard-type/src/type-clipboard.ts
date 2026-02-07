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
  const { humanCadence, humanCadenceSpeed } = getPreferenceValues<Preferences>();

  const humanCadenceSpeeds = {
    "very-slow": { min: 0.1, max: 0.3 },
    slow: { min: 0.05, max: 0.15 },
    average: { min: 0.02, max: 0.1 },
    fast: { min: 0.01, max: 0.05 },
    "very-fast": { min: 0.005, max: 0.02 },
    "super-human": { min: 0.001, max: 0.0 },
  };

  const humanCadenceRange = humanCadenceSpeeds[humanCadenceSpeed];

  const delayString = `(random number from ${humanCadenceRange.min} to ${humanCadenceRange.max})`;

  const appleScriptContent = `
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
    ${humanCadence ? `delay ${delayString}` : ""}
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
