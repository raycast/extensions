import { getFrontmostApplication, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Sequence } from "./types";

export const runShortcutSequence = async (sequence: Sequence) => {
  /* Runs each shortcut of a sequence in rapid succession. */
  const currentApplication = await getFrontmostApplication();
  sequence.shortcuts.forEach(async (shortcut) => {
    const keystroke = (function getKeystroke() {
      if (shortcut.keystrokes.includes("ASCII character")) {
        return `(${shortcut.keystrokes})`;
      }
      if (shortcut.keystrokes.includes("key code")) {
        return shortcut.keystrokes;
      }
      return `"${shortcut.keystrokes}"`;
    })();
    const modifier = shortcut.modifiers.length
      ? `using ${shortcut.modifiers.length > 1 ? `[${shortcut.modifiers.join(", ")}]` : shortcut.modifiers[0]}`
      : "";
    const script = `tell application "${currentApplication.name}"
            tell application "System Events"
                keystroke ${keystroke} ${modifier}
            end tell
        end tell`;
    await runAppleScript(script);
  });
  await showHUD(`Ran Shortcut Sequence: ${sequence.name}`);
};
