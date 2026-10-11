import { List } from "@raycast/api";
import { SectionShortcut } from "../model/internal/internal-models";
import { getModifierSymbols } from "../model/internal/modifiers";
import { getPlatform, Platform } from "../load/platform";

const macOSBaseKeySymbolOverride: Map<string, string> = new Map([
  ["left", "←"],
  ["right", "→"],
  ["up", "↑"],
  ["down", "↓"],
  ["pageup", "PgUp"],
  ["pagedown", "PgDown"],
  ["home", "Home"],
  ["end", "End"],
  ["space", "Space"],
  ["capslock", "⇪"],
  ["backspace", "⌫"],
  ["tab", "⇥"],
  ["esc", "⎋"],
  ["enter", "↩"],
  ["cmd", "⌘"],
  ["ctrl", "⌃"],
  ["opt", "⌥"],
  ["shift", "⇧"],
]);

const windowsBaseKeySymbolOverride: Map<string, string> = new Map([
  ["left", "Left"],
  ["right", "Right"],
  ["up", "Up"],
  ["down", "Down"],
  ["pageup", "PgUp"],
  ["pagedown", "PgDn"],
  ["home", "Home"],
  ["end", "End"],
  ["space", "Space"],
  ["capslock", "CapsLock"],
  ["backspace", "Backspace"],
  ["tab", "Tab"],
  ["esc", "Esc"],
  ["enter", "Enter"],
  ["cmd", "Cmd"],
  ["ctrl", "Ctrl"],
  ["opt", "Alt"],
  ["shift", "Shift"],
]);

function getBaseKeySymbolOverride(platform: Platform = getPlatform()): Map<string, string> {
  return platform === "macos" ? macOSBaseKeySymbolOverride : windowsBaseKeySymbolOverride;
}

function overrideSymbolIfPossible(base: string, platform: Platform = getPlatform()): string {
  return getBaseKeySymbolOverride(platform).get(base) ?? base.toUpperCase();
}

export function generateHotkeyText(shortcut: SectionShortcut, platform: Platform = getPlatform()): string {
  const modifierSymbols = getModifierSymbols(platform);
  const separator = platform === "windows" ? "+" : "";

  return shortcut.sequence
    .map((atomicShortcut) => {
      const modifiersText = atomicShortcut.modifiers
        .map((modifier) => modifierSymbols.get(modifier))
        .filter((symbol): symbol is string => symbol !== undefined)
        .join(separator);
      const baseText = overrideSymbolIfPossible(atomicShortcut.base, platform);
      return modifiersText + (modifiersText && separator ? separator : "") + baseText;
    })
    .join(" ");
}

export function generateHotkeyAccessories(
  shortcut: SectionShortcut,
  platform: Platform = getPlatform()
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const modifierSymbols = getModifierSymbols(platform);
  const separator = platform === "windows" ? "+" : " ";

  shortcut.sequence.forEach((atomicShortcut, sequenceIndex) => {
    if (sequenceIndex > 0) {
      accessories.push({ text: "then" });
    }

    const keys: string[] = [];
    for (const modifier of atomicShortcut.modifiers) {
      const symbol = modifierSymbols.get(modifier);
      if (symbol) {
        keys.push(symbol);
      }
    }
    keys.push(overrideSymbolIfPossible(atomicShortcut.base, platform));

    accessories.push({ tag: keys.join(separator) });
  });

  return accessories;
}
