import { Vault, VaultSharing } from "./types";

/**
 * Adds how each vault is shared. A vault missing from `sharing`, or whose sharing isn't fully known, keeps what
 * `previous` knew, e.g. the cached vaults when sharing couldn't be listed, or when pass-cli's vault list is saved.
 */
export function withSharing(vaults: Vault[], sharing: Map<string, VaultSharing> | undefined, previous: Vault[] = []) {
  const known = new Map(previous.map((vault) => [vault.shareId, vault]));
  return vaults.map((vault): Vault => {
    const fresh = sharing?.get(vault.shareId);
    const before = known.get(vault.shareId);
    const role = fresh?.role ?? vault.role ?? before?.role;
    // Whether a vault is shared was found for a role: after a role change, it's unknown until counted again.
    const isShared = fresh?.isShared ?? vault.isShared ?? (before?.role === role ? before?.isShared : undefined);
    return { ...vault, role, isShared };
  });
}

/** Tooltip of the icon marking a shared vault, or undefined when the vault isn't known to be shared. */
export function sharedVaultTooltip({ role, isShared }: Pick<Vault, "role" | "isShared">): string | undefined {
  if (role !== undefined && role !== "owner") {
    return `Shared with you · ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
  }
  return role === "owner" && isShared ? "Shared by you" : undefined;
}
