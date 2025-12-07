import { LocalStorage } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";
import {
  EnhancedVault,
  enhanceVault,
  updateLastAccessed as updateVaultLastAccessed,
} from "./vault-config";

const ACTIVE_VAULT_KEY = "active-vault-key";

/**
 * Get the currently active vault key from storage
 * Returns null if no active vault is set
 */
export async function getActiveVaultKey(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(ACTIVE_VAULT_KEY)) || null;
}

/**
 * Set the active vault
 */
export async function setActiveVault(vaultKey: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_VAULT_KEY, vaultKey);
  await updateVaultLastAccessed(vaultKey);
}

/**
 * Export updateLastAccessed for use by other modules
 */
export async function updateLastAccessed(vaultKey: string): Promise<void> {
  await updateVaultLastAccessed(vaultKey);
}

/**
 * Clear the active vault
 */
export async function clearActiveVault(): Promise<void> {
  await LocalStorage.removeItem(ACTIVE_VAULT_KEY);
}

/**
 * Get the active vault from a list of vaults
 * Returns null if no active vault is set or if the active vault is not in the list
 */
export async function getActiveVault(
  vaults: Vault[]
): Promise<EnhancedVault | null> {
  const activeKey = await getActiveVaultKey();
  if (!activeKey) {
    return null;
  }

  const vault = vaults.find((v) => v.key === activeKey);
  if (!vault) {
    // Active vault no longer exists, clear it
    await clearActiveVault();
    return null;
  }

  return await enhanceVault(vault);
}

/**
 * Get default vault based on active vault preference or heuristics
 * Priority:
 * 1. Active vault (if set and exists)
 * 2. Most recently accessed favorite vault
 * 3. First vault in the list
 */
export async function getDefaultVault(
  vaults: Vault[]
): Promise<EnhancedVault | null> {
  if (vaults.length === 0) {
    return null;
  }

  // Try to get active vault
  const activeVault = await getActiveVault(vaults);
  if (activeVault) {
    return activeVault;
  }

  // Return first vault as fallback (can be enhanced later with favorites)
  return await enhanceVault(vaults[0]);
}

/**
 * Check if a vault is the active vault
 */
export async function isActiveVault(vaultKey: string): Promise<boolean> {
  const activeKey = await getActiveVaultKey();
  return activeKey === vaultKey;
}

/**
 * Toggle active vault status (set as active if not active, clear if active)
 */
export async function toggleActiveVault(vaultKey: string): Promise<boolean> {
  const currentActive = await getActiveVaultKey();

  if (currentActive === vaultKey) {
    // Clear if already active
    await clearActiveVault();
    return false;
  } else {
    // Set as active
    await setActiveVault(vaultKey);
    return true;
  }
}
