import { Icon } from "@raycast/api";
import { MenuItem } from "../types";

const MODIFIER_KEYCODES: Record<number, string> = {
  0: "⌘", // Command only
  1: "⇧ ⌘", // Shift+Command
  2: "⌥ ⌘", // Option+Command
  3: "⌥ ⇧ ⌘", // Option+Shift+Command
  4: "⌃ ⌘", // Control+Command
  5: "⌃ ⇧ ⌘", // Control+Shift+Command
  6: "⌃ ⌥ ⌘", // Control+Option+Command
  7: "⌃ ⌥ ⇧ ⌘", // Control+Option+Shift+Command
  8: "⌥", // Option only
  9: "⇧ ⌥", // Shift+Option
  10: "⌥ ⌘", // Option+Command (alternative)
  11: "⌥ ⇧ ⌘", // Option+Shift+Command (alternative)
  12: "⌃", // Control only
  13: "⌃ ⇧", // Control+Shift
  14: "⌃ ⌥", // Control+Option
  15: "⌃ ⌥ ⇧", // Control+Option+Shift
  16: "⌘", // Command (alternative)
  17: "⇧ ⌘", // Shift+Command (alternative)
  24: "Fn", // Function key
  25: "Fn ⇧", // Function+Shift
  26: "Fn ⌥", // Function+Option
  27: "Fn ⌥ ⇧", // Function+Option+Shift
  28: "Fn ⌃", // Function+Control
  29: "Fn ⌃ ⇧", // Function+Control+Shift
  30: "Fn ⌃ ⌥", // Function+Control+Option
  31: "Fn ⌃ ⌥ ⇧", // Function+Control+Option+Shift
  32: "⇧", // Shift only
  33: "⇧ ⌘", // Shift+Command (alternative)
  40: "⌃ ⌘", // Control+Command (alternative)
  48: "Fn ⌘", // Function+Command
  49: "Fn ⇧ ⌘", // Function+Shift+Command
  50: "Fn ⌥ ⌘", // Function+Option+Command
  51: "Fn ⌥ ⇧ ⌘", // Function+Option+Shift+Command
  52: "Fn ⌃ ⌘", // Function+Control+Command
  53: "Fn ⌃ ⇧ ⌘", // Function+Control+Shift+Command
  54: "Fn ⌃ ⌥ ⌘", // Function+Control+Option+Command
  55: "Fn ⌃ ⌥ ⇧ ⌘", // Function+Control+Option+Shift+Command
};

const GLYPH_KEYCODES: Record<number | string, string> = {
  4: "⌫", // Backspace/Delete
  5: "⇥", // Tab
  6: "⇤", // Backtab
  11: "⏎", // Enter/Return
  13: "⏎", // Return/Enter (alternative)
  23: "⌫", // Delete/Backspace
  27: "⎋", // Escape
  28: "␣", // Space
  30: "⇞", // Page Up
  31: "⇟", // Page Down
  63: "⌦", // Forward Delete
  71: "⌧", // Clear
  76: "↩", // Return symbol
  79: "→", // Right Arrow
  80: "←", // Left Arrow
  81: "↓", // Down Arrow
  82: "↑", // Up Arrow
  100: "←", // Left Arrow (alternative)
  101: "→", // Right Arrow (alternative)
  104: "↑", // Up Arrow (alternative)
  106: "↓", // Down Arrow (alternative)
  114: "⌗", // Number/Hash
  115: "↖", // Home
  116: "⇞", // Page Up (alternative)
  117: "⌦", // Forward Delete (alternative)
  119: "↘", // End
  121: "⇟", // Page Down (alternative)
  123: "←", // Left Arrow (alternative)
  124: "→", // Right Arrow (alternative)
  125: "↓", // Down Arrow (alternative)
  126: "↑", // Up Arrow (alternative)
  149: "🌐", // Globe key
  150: "🎤", // Microphone
};

// Map special menu items to their SF Symbol icons
const SPECIAL_ICONS: Record<string, Icon> = {
  "Start Dictation": Icon.Microphone,
  "Emoji & Symbols": Icon.Globe,
};

/*
 * Handle replacing Fn with Globe icon
 */
function replaceFnWithGlobe(modifier: string) {
  const includesFn = modifier && /Fn\s?/.test(modifier);
  if (!includesFn) return { modifier, icon: null };

  return {
    modifier: modifier.replace(/Fn\s?/g, "").trim(),
    icon: Icon.Globe,
  };
}

// Helper function to determine accessories
export function getListItemAccessories(item: MenuItem) {
  if (SPECIAL_ICONS[item.shortcut]) {
    return [{ icon: SPECIAL_ICONS[item.shortcut] }];
  }

  if (item.submenu?.length) {
    return [{ tag: "Menu" }];
  }

  const modifier =
    item.modifier !== null ? MODIFIER_KEYCODES[item.modifier] : null;
  const glyph = item.glyph !== null ? GLYPH_KEYCODES[item.glyph] : null;

  if (modifier && (glyph || item.key)) {
    const modifierData = replaceFnWithGlobe(modifier);
    return [
      {
        icon: modifierData.icon,
        text: `${modifierData.modifier} ${glyph || item.key}`,
      },
    ];
  }

  return undefined;
}
