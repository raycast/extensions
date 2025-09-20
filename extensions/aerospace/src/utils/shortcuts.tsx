/* eslint-disable @typescript-eslint/no-explicit-any */
import { showHUD } from "@raycast/api";
import { AppConfig, Shortcut } from "./config";
import { mapKeyToKeyCode } from "./keys";
import { runAppleScript } from "@raycast/utils";

export async function executeShortcut(shortcut: string) {
  const parts = shortcut.split("-");
  const key = parts.pop(); // Assuming the last part is always the key
  if (!key) {
    console.error("No key found in shortcut");
    return;
  }
  const modifiers = parts
    .map((mod) => {
      switch (mod.toLowerCase()) {
        case "cmd":
          return "command down";
        case "ctrl":
          return "control down";
        case "alt":
          return "option down";
        case "shift":
          return "shift down";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(", ");

  const keyCode = mapKeyToKeyCode(key);

  console.log(`Executing shortcut: ${keyCode ? `key code ${keyCode}` : `keystroke "${key}"`} using {${modifiers}}`);
  const script = `
tell application "System Events"
    ${keyCode ? `key code ${keyCode}` : `keystroke "${key}"`} using {${modifiers}}
    return "Executed: ${shortcut}(${modifiers} - ${key})}"
end
`;

  try {
    const res = await runAppleScript(script, []);
    await showHUD(res);
  } catch (error) {
    console.error(`Failed to execute shortcut: ${error}`);
    await showHUD(`Failed to execute: ${shortcut}`);
  }
}

export function groupShortcutsByMode(shortcuts: Record<string, Shortcut>): Record<string, Shortcut[]> {
  const grouped: Record<string, Shortcut[]> = {};

  // Iterate over each shortcut
  Object.values(shortcuts).forEach((shortcut) => {
    // If the mode does not yet exist in the grouped object, initialize it
    if (!grouped[shortcut.mode]) {
      grouped[shortcut.mode] = [];
    }
    // Add the shortcut to the corresponding mode array
    grouped[shortcut.mode].push(shortcut);
  });

  return grouped;
}

export function extractKeyboardShortcuts(config: AppConfig): Record<string, Shortcut> {
  const shortcuts: Record<string, Shortcut> = {};
  console.log(config);
  // Check if 'mode' exists in the configuration
  if (config.mode) {
    // Iterate over each mode
    console.log("Modes:", Object.keys(config.mode));
    for (const mode of Object.keys(config.mode)) {
      console.log("Mode:", mode);
      const bindings = config.mode[mode]?.binding; // Add a type guard to check if config.mode[mode] is defined
      if (bindings) {
        // Add each key binding found to the shortcuts object
        for (const key of Object.keys(bindings)) {
          console.log("Key:", key, "\t\tValue:", bindings[key]);
          shortcuts[mode + key] = {
            mode: mode,
            shortcut: key,
            description: JSON.stringify(bindings[key])
              .replace(/"/g, "")
              // replaces dashes in-between command descriptions so they can be fuzzy searched.
              // For example move-workspace-to-monitor will be found by typing `move monitor`
              .replace(/(?<=\w)[-](?=\w)/g, " "),
          };
        }
      }
    }
  }

  return shortcuts;
}
