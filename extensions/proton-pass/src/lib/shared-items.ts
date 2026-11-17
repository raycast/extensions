import { Item, Vault } from "./types";

/**
 * Items shared with the user one by one are in none of their vaults: they are listed together under this entry, as
 * in Proton Pass. Its ID is no share's, so it never reaches pass-cli.
 */
export const SHARED_WITH_ME: Vault = { shareId: "shared-with-me", name: "Shared with Me" };

export function isSharedWithMe(vault: { shareId: string }): boolean {
  return vault.shareId === SHARED_WITH_ME.shareId;
}

/** The share ID of the vault, or of Shared with Me, that an item is listed under. */
export function listedUnder(item: Pick<Item, "shareId" | "sharedWithMe">): string {
  return item.sharedWithMe ? SHARED_WITH_ME.shareId : item.shareId;
}

/** An item shared with the user that is also in one of their vaults is listed with that vault only. */
export function withoutDuplicates(items: Item[]): Item[] {
  const inVaults = new Set(items.filter((item) => !item.sharedWithMe).map((item) => item.itemId));
  return items.filter((item) => !item.sharedWithMe || !inVaults.has(item.itemId));
}
