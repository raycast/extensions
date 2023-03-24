import { getFrontmostApplication, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Sequence } from "./types";

export const runShortcutSequence = async (sequence: Sequence) => {
  /* Runs each shortcut of a sequence in rapid succession. */
  const currentApplication = await getFrontmostApplication();
  sequence.shortcuts.forEach(async (shortcut) => {
    await runAppleScript(`tell application "${currentApplication.name}"
            tell application "System Events"
                keystroke ${
                  shortcut.keystrokes.includes("ASCII character")
                    ? `(${shortcut.keystrokes})`
                    : `"${shortcut.keystrokes}"`
                } using ${shortcut.modifiers.length > 1 ? `[${shortcut.modifiers.join(", ")}]` : shortcut.modifiers[0]}
            end tell
        end tell`);
  });
  await showHUD(`Ran Shortcut Sequence: ${sequence.name}`);
};
