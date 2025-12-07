import { Color, LocalStorage } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";

/**
 * Vault metadata for multi-vault support
 * Stored per-vault to enable custom naming, favoriting, and UI customization
 */
export interface VaultMetadata {
  key: string; // vault.key (file path) - unique identifier
  displayName?: string; // Custom display name (e.g., "Work Notes")
  abbreviation?: string; // Short form for compact views (e.g., "W", "P")
  emoji?: string; // Optional emoji prefix (e.g., "📝", "💼")
  color?: Color; // Color for badges and indicators
  isFavorite: boolean; // Whether this vault is pinned as favorite
  lastAccessed: Date; // Last time this vault was accessed
  hotkeyIndex?: number; // Index for hotkey assignment (1-5)
}

/**
 * Enhanced vault type that includes metadata
 */
export interface EnhancedVault extends Vault {
  metadata: VaultMetadata;
}

// LocalStorage keys
const VAULT_METADATA_PREFIX = "vault-metadata-";
const CONFIG_VERSION_KEY = "vault-config-version";
const CURRENT_CONFIG_VERSION = "1.0";

/**
 * Generate a storage key for vault metadata
 */
function getVaultMetadataKey(vaultKey: string): string {
  return `${VAULT_METADATA_PREFIX}${vaultKey}`;
}

/**
 * Load metadata for a specific vault
 * Returns default metadata if none exists
 */
export async function loadVaultMetadata(vault: Vault): Promise<VaultMetadata> {
  const key = getVaultMetadataKey(vault.key);
  const stored = await LocalStorage.getItem<string>(key);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Convert lastAccessed from string to Date
      return {
        ...parsed,
        lastAccessed: new Date(parsed.lastAccessed),
      };
    } catch (error) {
      console.error(`Failed to parse vault metadata for ${vault.name}:`, error);
    }
  }

  // Return default metadata
  return {
    key: vault.key,
    displayName: undefined, // Use folder name by default
    abbreviation: undefined,
    emoji: undefined,
    color: undefined,
    isFavorite: false,
    lastAccessed: new Date(0), // Epoch for never accessed
    hotkeyIndex: undefined,
  };
}

/**
 * Save metadata for a specific vault
 */
export async function saveVaultMetadata(
  metadata: VaultMetadata
): Promise<void> {
  const key = getVaultMetadataKey(metadata.key);
  await LocalStorage.setItem(key, JSON.stringify(metadata));
}

/**
 * Update last accessed timestamp for a vault
 */
export async function updateLastAccessed(vaultKey: string): Promise<void> {
  const key = getVaultMetadataKey(vaultKey);
  const stored = await LocalStorage.getItem<string>(key);

  if (stored) {
    try {
      const metadata = JSON.parse(stored);
      metadata.lastAccessed = new Date().toISOString();
      await LocalStorage.setItem(key, JSON.stringify(metadata));
    } catch (error) {
      console.error(
        `Failed to update last accessed for vault ${vaultKey}:`,
        error
      );
    }
  } else {
    // Create new metadata with current timestamp
    const metadata: VaultMetadata = {
      key: vaultKey,
      isFavorite: false,
      lastAccessed: new Date(),
    };
    await LocalStorage.setItem(key, JSON.stringify(metadata));
  }
}

/**
 * Toggle favorite status for a vault
 */
export async function toggleVaultFavorite(vaultKey: string): Promise<boolean> {
  const key = getVaultMetadataKey(vaultKey);
  const stored = await LocalStorage.getItem<string>(key);

  let metadata: VaultMetadata;
  if (stored) {
    metadata = JSON.parse(stored);
  } else {
    metadata = {
      key: vaultKey,
      isFavorite: false,
      lastAccessed: new Date(),
    };
  }

  metadata.isFavorite = !metadata.isFavorite;
  await LocalStorage.setItem(key, JSON.stringify(metadata));
  return metadata.isFavorite;
}

/**
 * Enhance a vault with its metadata
 */
export async function enhanceVault(vault: Vault): Promise<EnhancedVault> {
  const metadata = await loadVaultMetadata(vault);
  return {
    ...vault,
    metadata,
  };
}

/**
 * Enhance multiple vaults with their metadata
 */
export async function enhanceVaults(vaults: Vault[]): Promise<EnhancedVault[]> {
  return Promise.all(vaults.map((vault) => enhanceVault(vault)));
}

/**
 * Sort vaults by favorites first, then by last accessed, then alphabetically
 */
export function sortVaults(vaults: EnhancedVault[]): EnhancedVault[] {
  return [...vaults].sort((a, b) => {
    // Favorites first
    if (a.metadata.isFavorite && !b.metadata.isFavorite) return -1;
    if (!a.metadata.isFavorite && b.metadata.isFavorite) return 1;

    // Then by last accessed (most recent first)
    if (a.metadata.lastAccessed > b.metadata.lastAccessed) return -1;
    if (a.metadata.lastAccessed < b.metadata.lastAccessed) return 1;

    // Finally alphabetically by display name or name
    const nameA = a.metadata.displayName || a.name;
    const nameB = b.metadata.displayName || b.name;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Get display name for a vault (custom name or default folder name)
 */
export function getVaultDisplayName(vault: EnhancedVault): string {
  const displayName = vault.metadata.displayName || vault.name;
  const emoji = vault.metadata.emoji;
  return emoji ? `${emoji} ${displayName}` : displayName;
}

/**
 * Get abbreviated name for compact display
 */
export function getVaultAbbreviation(vault: EnhancedVault): string {
  if (vault.metadata.abbreviation) {
    return vault.metadata.abbreviation;
  }
  // Generate abbreviation from first letter of each word
  const words = (vault.metadata.displayName || vault.name).split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return words
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

/**
 * Initialize config version (for future migrations)
 */
export async function initializeConfigVersion(): Promise<void> {
  const version = await LocalStorage.getItem<string>(CONFIG_VERSION_KEY);
  if (!version) {
    await LocalStorage.setItem(CONFIG_VERSION_KEY, CURRENT_CONFIG_VERSION);
  }
}

/**
 * Delete metadata for a vault (cleanup when vault is removed)
 */
export async function deleteVaultMetadata(vaultKey: string): Promise<void> {
  const key = getVaultMetadataKey(vaultKey);
  await LocalStorage.removeItem(key);
}

/**
 * Get all favorite vaults
 */
export async function getFavoriteVaults(
  vaults: Vault[]
): Promise<EnhancedVault[]> {
  const enhanced = await enhanceVaults(vaults);
  return enhanced.filter((v) => v.metadata.isFavorite);
}

/**
 * Assign hotkey index to favorite vaults (1-5)
 */
export async function assignHotkeyIndexes(
  vaults: EnhancedVault[]
): Promise<void> {
  const favorites = sortVaults(vaults.filter((v) => v.metadata.isFavorite));

  for (let i = 0; i < Math.min(favorites.length, 5); i++) {
    const vault = favorites[i];
    if (vault.metadata.hotkeyIndex !== i + 1) {
      vault.metadata.hotkeyIndex = i + 1;
      await saveVaultMetadata(vault.metadata);
    }
  }
}
