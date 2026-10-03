import { VaultRole } from "./types";

/** Tooltip of the icon marking a vault shared with the user, or undefined for the user's own vaults. */
export function sharedVaultTooltip(role: VaultRole | undefined): string | undefined {
  if (role === undefined || role === "owner") return undefined;
  return `Shared with you · ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}
