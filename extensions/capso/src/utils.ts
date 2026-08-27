import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execSync } from "child_process";

export interface ShortcutConfig {
  keyCode: number;
  modifiers: string;
}

/**
 * Dynamically reads the user's custom Capso shortcut from macOS UserDefaults.
 * Converts Carbon modifiers bitmask to AppleScript modifier syntax.
 */
export function getCapsoShortcut(
  actionKey: string,
  defaultKeyCode: number,
  defaultModifiers = "option down, shift down",
): ShortcutConfig {
  try {
    const raw = execSync(
      `defaults read com.awesomemacapps.capso KeyboardShortcuts_${actionKey} 2>/dev/null`,
      { encoding: "utf8" },
    ).trim();

    if (!raw) {
      return { keyCode: defaultKeyCode, modifiers: defaultModifiers };
    }

    const parsed = JSON.parse(raw);
    const keyCode = parsed.carbonKeyCode ?? defaultKeyCode;
    const carbonMods: number = parsed.carbonModifiers ?? 0;

    const modifiers: string[] = [];
    if (carbonMods & 256) modifiers.push("command down");
    if (carbonMods & 512) modifiers.push("shift down");
    if (carbonMods & 2048) modifiers.push("option down");
    if (carbonMods & 4096) modifiers.push("control down");

    return {
      keyCode,
      modifiers: modifiers.length > 0 ? modifiers.join(", ") : defaultModifiers,
    };
  } catch {
    return { keyCode: defaultKeyCode, modifiers: defaultModifiers };
  }
}

/**
 * Executes the resolved hotkey after closing the Raycast window.
 */
export async function triggerCapsoAction(
  actionKey: string,
  defaultKeyCode: number,
  label: string,
  defaultModifiers = "option down, shift down",
) {
  try {
    const { keyCode, modifiers } = getCapsoShortcut(
      actionKey,
      defaultKeyCode,
      defaultModifiers,
    );
    await closeMainWindow();

    const script = `
      delay 0.1
      tell application "System Events"
        key code ${keyCode} using {${modifiers}}
      end tell
    `;

    await runAppleScript(script);
  } catch (error) {
    await showHUD(`❌ Failed to trigger ${label}`);
    console.error(error);
  }
}
