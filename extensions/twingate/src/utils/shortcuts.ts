import { Keyboard } from "@raycast/api";

export interface ParsedShortcut {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
}

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
  refreshResources: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "r" as Keyboard.KeyEquivalent,
  },
  clearData: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "x" as Keyboard.KeyEquivalent,
  },
  debugMode: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "d" as Keyboard.KeyEquivalent,
  },
  exportLogs: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "l" as Keyboard.KeyEquivalent,
  },
  toggleFavorite: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "f" as Keyboard.KeyEquivalent,
  },
  copyUrl: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "c" as Keyboard.KeyEquivalent,
  },
  copyAddress: {
    modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[],
    key: "c" as Keyboard.KeyEquivalent,
  },
  copyAlias: {
    modifiers: ["cmd", "opt"] as Keyboard.KeyModifier[],
    key: "c" as Keyboard.KeyEquivalent,
  },
  copyName: {
    modifiers: ["cmd", "shift", "opt"] as Keyboard.KeyModifier[],
    key: "c" as Keyboard.KeyEquivalent,
  },
  openMainSearch: {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: "o" as Keyboard.KeyEquivalent,
  },
};
