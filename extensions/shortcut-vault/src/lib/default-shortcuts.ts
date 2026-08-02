import { defaultShortcutDatasets } from "../data/generated-default-shortcuts";
import type { Shortcut } from "../types/shortcut";
import { formatShortcutDisplay, normalizeKey, normalizeModifiers } from "./shortcut-format";

const DEFAULT_TIMESTAMP = "2026-07-04T00:00:00.000Z";

let defaultShortcutCache: Shortcut[] | undefined;

export function getDefaultShortcuts(): Shortcut[] {
  if (!defaultShortcutCache) {
    defaultShortcutCache = defaultShortcutDatasets
      .flatMap((dataset): Shortcut[] =>
        dataset.shortcuts.map((shortcut) => ({
          id: `default:${dataset.ownerName.toLowerCase().replaceAll(" ", "-")}:${shortcut.id}`,
          commandName: shortcut.commandName,
          modifiers: normalizeModifiers(shortcut.modifiers),
          key: normalizeKey(shortcut.key),
          shortcutDisplay: formatShortcutDisplay(shortcut.modifiers, shortcut.key),
          ownerName: dataset.ownerName,
          ownerType: dataset.ownerType,
          scope: shortcut.scope,
          notes: shortcut.notes,
          sourceType: "default",
          sourceUrl: shortcut.sourceUrl ?? dataset.sourceUrl,
          createdAt: DEFAULT_TIMESTAMP,
          updatedAt: DEFAULT_TIMESTAMP,
        })),
      )
      .sort(sortShortcuts);
  }

  return defaultShortcutCache;
}

function sortShortcuts(a: Shortcut, b: Shortcut): number {
  const ownerCompare = a.ownerName.localeCompare(b.ownerName);
  if (ownerCompare !== 0) {
    return ownerCompare;
  }

  return a.commandName.localeCompare(b.commandName);
}
