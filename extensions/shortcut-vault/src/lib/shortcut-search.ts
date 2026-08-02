import type { Shortcut } from "../types/shortcut";
import { OWNER_TYPE_LABELS, SCOPE_LABELS, SOURCE_LABELS } from "./labels";

const searchIndexCache = new WeakMap<Shortcut, string[]>();

export function searchShortcuts(shortcuts: Shortcut[], query: string): Shortcut[] {
  const terms = tokenizeSearchQuery(query);

  if (terms.length === 0) {
    return shortcuts;
  }

  return shortcuts.filter((shortcut) => {
    const index = getShortcutSearchIndex(shortcut);
    return terms.every((term) => index.some((value) => matchesSearchTerm(value, term)));
  });
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchValue(query);
  return normalized
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term && term !== "plus");
}

function getShortcutSearchIndex(shortcut: Shortcut): string[] {
  const cached = searchIndexCache.get(shortcut);
  if (cached) {
    return cached;
  }

  const index = buildShortcutSearchIndex(shortcut);
  searchIndexCache.set(shortcut, index);
  return index;
}

function buildShortcutSearchIndex(shortcut: Shortcut): string[] {
  return [
    shortcut.commandName,
    shortcut.shortcutDisplay,
    shortcut.ownerName,
    shortcut.ownerType,
    OWNER_TYPE_LABELS[shortcut.ownerType],
    shortcut.scope,
    SCOPE_LABELS[shortcut.scope],
    shortcut.sourceType,
    SOURCE_LABELS[shortcut.sourceType],
    shortcut.key,
    ...shortcut.modifiers,
  ].map(normalizeSearchValue);
}

function normalizeSearchValue(value: string): string {
  return value
    .toLocaleLowerCase()
    .replaceAll("⌘", " command ")
    .replaceAll("⌥", " option ")
    .replaceAll("⌃", " control ")
    .replaceAll("⇧", " shift ")
    .replaceAll("?", " question ")
    .replaceAll("!", " exclamation ")
    .replaceAll("#", " hash ")
    .replaceAll("@", " at ")
    .replaceAll("/", " slash ")
    .replaceAll("\\", " backslash ")
    .replaceAll(".", " dot ")
    .replaceAll(",", " comma ")
    .replaceAll("`", " grave ")
    .replaceAll("~", " tilde ")
    .replaceAll("'", " quote ")
    .replaceAll("[", " left bracket ")
    .replaceAll("]", " right bracket ")
    .replaceAll("-", " minus ")
    .replaceAll("=", " equals ")
    .replaceAll("→", " right arrow ")
    .replaceAll("←", " left arrow ")
    .replaceAll("↑", " up arrow ")
    .replaceAll("↓", " down arrow ")
    .replace(/\bcmd\b/g, "command")
    .replace(/\bcommand\b/g, "command")
    .replace(/\bopt\b/g, "option")
    .replace(/\balt\b/g, "option")
    .replace(/\boption\b/g, "option")
    .replace(/\bctrl\b/g, "control")
    .replace(/\bctl\b/g, "control")
    .replace(/\bcontrol\b/g, "control")
    .replace(/\bshift\b/g, "shift")
    .replace(/\bfn\b/g, "fn")
    .replace(/\besc\b/g, "esc escape")
    .replace(/\bescape\b/g, "esc escape")
    .replace(/\breturn\b/g, "return enter")
    .replace(/\benter\b/g, "return enter")
    .replace(/\bdel\b/g, "delete backspace")
    .replace(/\bbackspace\b/g, "delete backspace")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function matchesSearchTerm(value: string, term: string): boolean {
  if (term.length === 1) {
    return value.split(" ").includes(term);
  }

  return value.includes(term);
}
