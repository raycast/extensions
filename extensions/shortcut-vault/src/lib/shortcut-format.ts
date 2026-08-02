import type { Shortcut, ShortcutModifier } from "../types/shortcut";
import { MODIFIER_SYMBOLS, SCOPE_LABELS, SOURCE_LABELS } from "./labels";

const modifierOrder: ShortcutModifier[] = ["command", "option", "control", "shift", "fn"];

const keyLabels = new Map<string, string>([
  [" ", "Space"],
  ["space", "Space"],
  ["enter", "Enter"],
  ["return", "Enter"],
  ["escape", "Esc"],
  ["esc", "Esc"],
  ["tab", "Tab"],
  ["backspace", "Backspace"],
  ["delete", "Delete"],
  ["up", "↑"],
  ["down", "↓"],
  ["left", "←"],
  ["right", "→"],
]);

export function normalizeKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return "";
  }

  const mapped = keyLabels.get(trimmed.toLowerCase());
  if (mapped) {
    return mapped;
  }

  return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
}

export function normalizeModifiers(modifiers: ShortcutModifier[]): ShortcutModifier[] {
  const unique = new Set(modifiers);
  return modifierOrder.filter((modifier) => unique.has(modifier));
}

export function formatShortcutDisplay(modifiers: ShortcutModifier[], key: string): string {
  const normalizedKey = normalizeKey(key);
  const parts = normalizeModifiers(modifiers).map((modifier) => MODIFIER_SYMBOLS[modifier]);

  if (normalizedKey) {
    parts.push(normalizedKey);
  }

  return parts.join(" + ");
}

export function getShortcutSubtitle(shortcut: Shortcut): string {
  return shortcut.shortcutDisplay;
}

export function getShortcutAccessoryText(shortcut: Shortcut): string {
  return `${shortcut.ownerName} • ${SOURCE_LABELS[shortcut.sourceType]} • ${SCOPE_LABELS[shortcut.scope]}`;
}

export function getFullShortcutText(shortcut: Shortcut): string {
  return `${shortcut.commandName} — ${shortcut.shortcutDisplay} (${getShortcutAccessoryText(shortcut)})`;
}

export function buildSearchKeywords(shortcut: Shortcut): string[] {
  return [
    shortcut.commandName,
    shortcut.shortcutDisplay,
    shortcut.ownerName,
    shortcut.key,
    shortcut.scope,
    SCOPE_LABELS[shortcut.scope],
    shortcut.sourceType,
    SOURCE_LABELS[shortcut.sourceType],
    ...shortcut.modifiers,
  ].filter(Boolean);
}
