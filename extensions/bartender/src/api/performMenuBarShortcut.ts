import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { MenuBarShortcut } from "../hooks";
import { Result, ShortcutKeyType } from "../types";
import { performMenuBarAction } from "./performMenuBarAction";

function readDelayPreferences(): { keyPressDelay: number; clickDelay: number } {
  const prefs = getPreferenceValues<Preferences.MenuBarShortcuts>();

  function parseNumericPreference(value: string, defaultValue: number): number {
    const parsed = parseInt(value, 10);

    if (!isNaN(parsed) && value.trim() === parsed.toString()) {
      return Math.max(0, parsed);
    }

    return defaultValue;
  }

  return {
    keyPressDelay: parseNumericPreference(prefs.keyPressDelay, 50),
    clickDelay: parseNumericPreference(prefs.clickDelay, 150),
  };
}

// Special keys need to use key codes in AppleScript
const KEY_CODE_MAP: Record<string, number> = {
  return: 36,
  escape: 53,
  up: 126,
  down: 125,
  left: 123,
  right: 124,
};

function buildKeySequenceAppleScript(keySequence: ShortcutKeyType[], delay: number): string {
  if (keySequence.length === 0) {
    return "";
  }

  const delaySeconds = delay > 0 ? delay / 1000 : undefined;
  const join = delaySeconds ? `\n  delay ${delaySeconds}\n  ` : "\n  ";

  const keyCommands = keySequence
    .map((key) => {
      if (key in KEY_CODE_MAP) {
        return `key code ${KEY_CODE_MAP[key]}`;
      }
      return `keystroke "${key}"`;
    })
    .join(join);

  return `
tell application "System Events"
  ${keyCommands}
end tell
  `;
}

export async function performMenuBarShortcut(shortcut: Omit<MenuBarShortcut, "name">): Promise<Result<void>> {
  const {
    menuBarId,
    actionType,
    keySequence,
    customClickDelay: customClickDelay,
    customKeypressDelay: customKeypressDelay,
  } = shortcut;
  const result = await performMenuBarAction(menuBarId, actionType);

  if (result.status !== "success") {
    return result;
  }

  if (keySequence.length > 0) {
    const { keyPressDelay: defaultKeyPressDelay, clickDelay: defaultClickDelay } = readDelayPreferences();
    const effectiveKeypressDelay = customKeypressDelay !== undefined ? customKeypressDelay : defaultKeyPressDelay;
    const script = buildKeySequenceAppleScript(keySequence, effectiveKeypressDelay);

    const effectiveClickDelay = customClickDelay !== undefined ? customClickDelay : defaultClickDelay;

    try {
      if (effectiveClickDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, effectiveClickDelay));
      }
      await runAppleScript(script);
    } catch (error) {
      return {
        status: "error",
        error: `Failed to execute key sequence: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  return { status: "success" };
}
