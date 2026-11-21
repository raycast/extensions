import type { VaultItem } from "../types";

function matchesQuery(item: VaultItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [item.title, item.subtitle, item.username, item.email]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return haystack.some((value) => value.includes(normalized));
}

export function sortVaultItems(items: VaultItem[]): VaultItem[] {
  return items.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export function filterVaultItems(items: VaultItem[], query: string): VaultItem[] {
  return sortVaultItems(items.filter((item) => matchesQuery(item, query)));
}
