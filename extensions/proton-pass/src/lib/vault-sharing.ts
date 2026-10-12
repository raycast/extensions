import { SavedSharing, Vault, VaultSharing } from "./types";

/**
 * Sharing to show and save after listing it: a vault whose members couldn't be counted keeps whether it was
 * shared, unless the user's role on it changed since. Vaults that are gone are dropped.
 */
export function mergeSharing(fresh: Map<string, VaultSharing>, saved: SavedSharing = {}): SavedSharing {
  return Object.fromEntries(
    Array.from(fresh, ([shareId, { role, isShared }]) => {
      const before = saved[shareId];
      return [shareId, { role, isShared: isShared ?? (before?.role === role ? before.isShared : undefined) }];
    }),
  );
}

/** Adds how each vault is shared, when known. */
export function withSharing(vaults: Vault[], sharing: SavedSharing): Vault[] {
  return vaults.map((vault) => ({ ...vault, ...sharing[vault.shareId] }));
}

/** Tooltip of the icon marking a shared vault, or undefined when the vault isn't known to be shared. */
export function sharedVaultTooltip({ role, isShared }: Pick<Vault, "role" | "isShared">): string | undefined {
  if (role !== undefined && role !== "owner") {
    return `Shared with you · ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
  }
  return role === "owner" && isShared ? "Shared by you" : undefined;
}
