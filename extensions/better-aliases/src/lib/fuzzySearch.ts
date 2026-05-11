import Fuse, { type IFuseOptions } from "fuse.js";
import type { BetterAliasesConfig, BetterAliasItem } from "../schemas";
import type { AliasEntry } from "./aliasFiltering";

interface SearchableItem {
  alias: string;
  aliasItem: BetterAliasItem;
}

const FUSE_OPTIONS: IFuseOptions<SearchableItem> = {
  keys: [
    { name: "alias", weight: 0.4 },
    { name: "aliasItem.label", weight: 0.3 },
    { name: "aliasItem.value", weight: 0.3 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
};

/**
 * Performs a fuzzy search on aliases using Fuse.js
 * @param aliases - The map of aliases to search
 * @param searchText - The text to search for
 * @returns Sorted list of matching alias entries
 */
export function fuzzySearchAliases(aliases: BetterAliasesConfig, searchText: string): AliasEntry[] {
  const entries = Object.entries(aliases);
  if (!searchText.trim()) return entries;

  const searchableItems: SearchableItem[] = entries.map(([alias, aliasItem]) => ({
    alias,
    aliasItem,
  }));
  const fuse = new Fuse(searchableItems, FUSE_OPTIONS);

  return fuse.search(searchText).map((r) => [r.item.alias, r.item.aliasItem]);
}
