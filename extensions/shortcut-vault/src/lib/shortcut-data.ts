import type { OwnerType, Shortcut, ShortcutFilter } from "../types/shortcut";
import { getDefaultShortcuts } from "./default-shortcuts";
import { getCustomShortcuts } from "./storage";

export type ShortcutOwnerOption = {
  ownerName: string;
  ownerType: OwnerType;
};

export async function getShortcuts(filter: ShortcutFilter): Promise<Shortcut[]> {
  if (filter === "default") {
    return getDefaultShortcuts();
  }

  const defaults = filter === "custom" ? [] : getDefaultShortcuts();
  const custom = await getCustomShortcuts();

  return [...custom, ...defaults].sort(sortShortcuts);
}

export async function getShortcutOwnerOptions(): Promise<ShortcutOwnerOption[]> {
  const shortcuts = await getShortcuts("all");
  const owners = new Map<string, ShortcutOwnerOption>();

  for (const shortcut of shortcuts) {
    const key = normalizeOwnerKey(shortcut.ownerName);
    if (key === "general") {
      continue;
    }

    const existing = owners.get(key);

    if (
      !existing ||
      getOwnerTypePriority(shortcut.ownerType) < getOwnerTypePriority(existing.ownerType)
    ) {
      owners.set(key, { ownerName: shortcut.ownerName, ownerType: shortcut.ownerType });
    }
  }

  return Array.from(owners.values()).sort((a, b) => a.ownerName.localeCompare(b.ownerName));
}

function sortShortcuts(a: Shortcut, b: Shortcut): number {
  const ownerCompare = a.ownerName.localeCompare(b.ownerName);
  if (ownerCompare !== 0) {
    return ownerCompare;
  }

  return a.commandName.localeCompare(b.commandName);
}

function normalizeOwnerKey(ownerName: string): string {
  return ownerName.trim().toLocaleLowerCase();
}

function getOwnerTypePriority(ownerType: OwnerType): number {
  switch (ownerType) {
    case "mac-app":
      return 0;
    case "webapp":
      return 1;
    case "system":
      return 2;
    case "other":
      return 3;
  }
}
