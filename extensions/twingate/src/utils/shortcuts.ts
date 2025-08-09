import { Keyboard } from "@raycast/api";

export type ParsedShortcut =
  | {
      modifiers: Keyboard.KeyModifier[];
      key: Keyboard.KeyEquivalent;
    }
  | {
      windows: {
        modifiers: Keyboard.KeyModifier[];
        key: Keyboard.KeyEquivalent;
      };
      macOS: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };
    };

/**
 * Parse a shortcut string (e.g. "cmd+shift+c") into Raycast's keyboard shortcut format
 */
export function parseShortcut(
  shortcutString: string,
): ParsedShortcut | undefined {
  if (!shortcutString) return undefined;

  const parts = shortcutString.toLowerCase().split("+");
  const modifiers: Keyboard.KeyModifier[] = [];
  let key: string | undefined;

  for (const part of parts) {
    const trimmedPart = part.trim();

    // Check if it's a modifier
    if (trimmedPart === "cmd" || trimmedPart === "command") {
      modifiers.push("cmd");
    } else if (trimmedPart === "ctrl" || trimmedPart === "control") {
      modifiers.push("ctrl");
    } else if (
      trimmedPart === "opt" ||
      trimmedPart === "option" ||
      trimmedPart === "alt"
    ) {
      modifiers.push("opt");
    } else if (trimmedPart === "shift") {
      modifiers.push("shift");
    } else {
      // This should be the key
      key = trimmedPart;
    }
  }

  if (!key) return undefined;

  return {
    modifiers,
    key: key as Keyboard.KeyEquivalent,
  };
}

/**
 * Get default shortcuts as fallback
 */
export const DEFAULT_SHORTCUTS = {
  refreshResources: Keyboard.Shortcut.Common.Refresh,
  clearData: Keyboard.Shortcut.Common.RemoveAll,
  debugMode: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "d" as Keyboard.KeyEquivalent,
  },
  exportLogs: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "l" as Keyboard.KeyEquivalent,
  },
  toggleFavorite: Keyboard.Shortcut.Common.Pin,
  copyUrl: Keyboard.Shortcut.Common.Copy,
  copyAddress: Keyboard.Shortcut.Common.CopyPath,
  copyAlias: {
    modifiers: ["cmd", "opt"] as Keyboard.KeyModifier[],
    key: "c" as Keyboard.KeyEquivalent,
  },
  copyName: Keyboard.Shortcut.Common.CopyName,
  openMainSearch: Keyboard.Shortcut.Common.Open,
};
