import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { setTimeout } from "timers/promises";

export type Preferences = {
  charDelayMs: string;
  startDelayMs: string;
  pressReturn: boolean;
};

export const TYPING_SCRIPT = `
on run argv
  set theText to (item 1 of argv) as text
  set charDelay to (item 2 of argv) as real
  set pressEnd to (item 3 of argv) is "1"
  set charList to characters of theText
  tell application "System Events"
    repeat with c in charList
      set ch to contents of c
      if ch is linefeed then
        key code 36
      else if ch is tab then
        key code 48
      else
        keystroke ch
      end if
      delay charDelay
    end repeat
    if pressEnd then
      key code 36
    end if
  end tell
end run
`;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Types out text character by character into the frontmost app. */
export async function typeOutText(rawText: string): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const text = rawText.replace(/\r\n?/g, "\n");

  if (text.length === 0) {
    await showHUD("Type Out: nothing to type");
    return;
  }

  const charDelayMs = clamp(
    Number.parseFloat(prefs.charDelayMs) || 25,
    5,
    1000,
  );
  const startDelayMs = clamp(
    Number.parseInt(prefs.startDelayMs, 10) || 300,
    0,
    10_000,
  );
  const pressReturn = prefs.pressReturn ?? false;

  // Close the Raycast window so focus returns to the app we want to type into
  await closeMainWindow({ clearRootSearch: true });
  await setTimeout(startDelayMs);

  try {
    await runAppleScript(
      TYPING_SCRIPT,
      [text, (charDelayMs / 1000).toFixed(4), pressReturn ? "1" : "0"],
      // Generous timeout: the keystroke loop takes length × delay milliseconds
      { timeout: text.length * charDelayMs * 3 + 60_000 },
    );
    await showHUD(`Typed ${text.length} characters`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not allowed to send keystrokes|assistive access/i.test(message)) {
      await showHUD(
        "Type Out needs Accessibility permission: System Settings → Privacy & Security → Accessibility → enable Raycast",
      );
    } else {
      await showHUD(`Type Out failed: ${message}`);
    }
  }
}
