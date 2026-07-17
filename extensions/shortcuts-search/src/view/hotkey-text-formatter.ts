import { List } from "@raycast/api";
import { SectionShortcut } from "../model/internal/internal-models";
import { modifierSymbols } from "../model/internal/modifiers";

const baseKeySymbolOverride: Map<string, string> = new Map([
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

function overrideSymbolIfPossible(base: string): string {
  return baseKeySymbolOverride.get(base) ?? base.toUpperCase();
}

export function generateHotkeyText(shortcut: SectionShortcut): string {
  return shortcut.sequence
    .map((atomicShortcut) => {
      const modifiersText = atomicShortcut.modifiers.map((modifier) => modifierSymbols.get(modifier)).join("") ?? "";
      return modifiersText + overrideSymbolIfPossible(atomicShortcut.base);
    })
    .join(" ");
}

export function generateHotkeyAccessories(shortcut: SectionShortcut): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

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
    keys.push(overrideSymbolIfPossible(atomicShortcut.base));

    accessories.push({ tag: keys.join(" ") });
  });

  return accessories;
}
