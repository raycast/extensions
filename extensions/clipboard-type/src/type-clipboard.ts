import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const shiftedKeyCodes = [
  ["!", 18],
  ["@", 19],
  ["#", 20],
  ["$", 21],
  ["%", 23],
  ["^", 22],
  ["&", 26],
  ["*", 28],
  ["(", 25],
  [")", 29],
  ["_", 27],
  ["+", 24],
  ["{", 33],
  ["}", 30],
  ["|", 42],
  [":", 41],
  ['"', 39],
  ["<", 43],
  [">", 47],
  ["?", 44],
  ["~", 50],
] as const;

function buildShiftedCharacterBranches() {
  return shiftedKeyCodes
    .map(([character, keyCode]) => {
      const condition = character === '"' ? "quote" : `"${character}"`;
      return `    else if c is ${condition} then\n      key code ${keyCode} using shift down`;
    })
    .join("\n");
}

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showFailureToast("Clipboard is empty");
    return;
  }
  await showHUD("Typing Clipboard...");
  const { humanCadence, humanCadenceSpeed, softNewlines } = getPreferenceValues<Preferences>();

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
  const shiftedCharacterBranches = buildShiftedCharacterBranches();

  const appleScriptContent = `
set theText to the clipboard as text
delay 0.2
tell application "System Events"
  repeat with ch in characters of theText
    set c to contents of ch
    if c is return or c is linefeed then
      key code 36${softNewlines ? " using shift down" : ""}
    else if c is tab then
      key code 48
${shiftedCharacterBranches}
    else
      keystroke c
    end if
    ${humanCadence ? `delay ${delayString}` : ""}
  end repeat
end tell
`;

  // Execute the AppleScript using osascript directly
  try {
    await runAppleScript(appleScriptContent, {
      timeout: 0, // runAppleScript defaults to 10s: typing long text + human cadence can exceed that
    });
    await showHUD("Finished Typing Clipboard");
  } catch (error) {
    await showFailureToast(error);
  }
}
