import { closeMainWindow, getFrontmostApplication, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Sequence, specialKeys } from "./types";

const FN_KEY_CODE = "63";

export const runShortcutSequence = async (sequence: Sequence) => {
  /* Runs each shortcut of a sequence in rapid succession. */
  const currentApplication = await getFrontmostApplication();

  // Hide Raycast overlay immediately
  await closeMainWindow();
  const toast = await showToast({ title: `Running: ${sequence.name}`, style: Toast.Style.Animated });

  try {
    for (const shortcut of sequence.shortcuts) {
      const delay = shortcut.delay || 0;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const keystroke = (function getKeystroke() {
        if (shortcut.keystrokes.includes("ASCII character")) {
          return `(${shortcut.keystrokes})`;
        }
        if (shortcut.keystrokes.includes("key code")) {
          return shortcut.keystrokes;
        }
        return `"${shortcut.keystrokes}"`;
      })();

      const specials =
        shortcut.specials?.length > 1
          ? `key code {${shortcut.specials.map((key) => specialKeys[key]).join(", ")}}`
          : shortcut.specials?.length === 1
          ? `key code ${specialKeys[shortcut.specials[0]]}`
          : "";

      const hasFnModifier = shortcut.modifiers.includes("fn down");
      const regularModifiers = shortcut.modifiers.filter((mod) => mod !== "fn down");

      const modifier = regularModifiers.length
        ? `using ${regularModifiers.length > 1 ? `{${regularModifiers.join(", ")}}` : regularModifiers[0]}`
        : "";

      // Build the script with or without fn key
      let script;
      if (hasFnModifier) {
        // When fn is needed, use key down/up approach
        script = `tell application "${currentApplication.name}"
        tell application "System Events"
          key down ${FN_KEY_CODE}
          ${specials ? `${specials}` : `keystroke ${keystroke}`} ${modifier}
          key up ${FN_KEY_CODE}
        end tell
      end tell`;
      } else {
        // Normal approach without fn
        script = `tell application "${currentApplication.name}"
        tell application "System Events"
          ${specials ? `${specials}` : `keystroke ${keystroke}`} ${modifier}
        end tell
      end tell`;
      }

      await runAppleScript(script);
    }
  } catch (error) {
    toast.title = `Failed to Run Sequence ${sequence.name}`;
    toast.style = Toast.Style.Failure;
    return;
  }

  toast.title = `Sequence ${sequence.name} finished`;
  toast.style = Toast.Style.Success;
};
