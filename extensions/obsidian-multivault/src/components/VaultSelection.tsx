import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";
import { ShowVaultInFinderAction } from "../utils/actions";
import { useEffect, useState } from "react";
import {
  EnhancedVault,
  enhanceVaults,
  sortVaults,
  getVaultDisplayName,
  toggleVaultFavorite,
} from "../utils/vault-config";
import { setActiveVault, getActiveVaultKey } from "../utils/vault-context";

interface VaultSelectionProps {
  vaults: Vault[];
  target: (vault: Vault) => React.ReactNode;
  allowAllVaults?: boolean; // Allow "All Vaults" option
  showMetadata?: boolean; // Show metadata (favorites, last accessed, etc.)
  onAllVaults?: () => React.ReactNode; // Callback for "All Vaults" option
}

export function VaultSelection(props: VaultSelectionProps) {
  const {
    vaults,
    target,
    allowAllVaults = false,
    showMetadata = true,
    onAllVaults,
  } = props;
  const [enhancedVaults, setEnhancedVaults] = useState<EnhancedVault[]>([]);
  const [activeVaultKey, setActiveVaultKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVaults() {
      setIsLoading(true);
      const enhanced = await enhanceVaults(vaults);
      const sorted = sortVaults(enhanced);
      setEnhancedVaults(sorted);

      const active = await getActiveVaultKey();
      setActiveVaultKey(active);

      setIsLoading(false);
    }

    loadVaults();
  }, [vaults]);

  const handleToggleFavorite = async (vaultKey: string) => {
    await toggleVaultFavorite(vaultKey);
    // Reload vaults to reflect changes
    const enhanced = await enhanceVaults(vaults);
    const sorted = sortVaults(enhanced);
    setEnhancedVaults(sorted);
  };

  const handleSetActive = async (vaultKey: string) => {
    await setActiveVault(vaultKey);
    setActiveVaultKey(vaultKey);
  };

  const getAccessories = (vault: EnhancedVault) => {
    if (!showMetadata) return undefined;

    const accessories: List.Item.Accessory[] = [];

    // Add favorite star
    if (vault.metadata.isFavorite) {
      accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
    }

    // Add active indicator
    if (activeVaultKey === vault.key) {
      accessories.push({ icon: Icon.CheckCircle, tooltip: "Active Vault" });
    }

    // Add last accessed time (if accessed before)
    if (vault.metadata.lastAccessed.getTime() > 0) {
      const now = new Date();
      const diff = now.getTime() - vault.metadata.lastAccessed.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        accessories.push({ text: "Today" });
      } else if (days === 1) {
        accessories.push({ text: "Yesterday" });
      } else if (days < 7) {
        accessories.push({ text: `${days}d ago` });
      }
    }

    return accessories;
  };

  return (
    <List isLoading={isLoading}>
      {allowAllVaults && onAllVaults && (
        <List.Item
          title="All Vaults"
          icon={{ source: Icon.List, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push title="Search All Vaults" target={onAllVaults()} />
            </ActionPanel>
          }
        />
      )}

      {enhancedVaults.map((vault) => (
        <List.Item
          title={getVaultDisplayName(vault)}
          key={vault.key}
          accessories={getAccessories(vault)}
          icon={
            vault.metadata.color
              ? { source: Icon.Folder, tintColor: vault.metadata.color }
              : Icon.Folder
          }
          actions={
            <ActionPanel>
              <Action.Push title="Select Vault" target={target(vault)} />
              <Action
                title="Toggle Favorite"
                icon={vault.metadata.isFavorite ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => handleToggleFavorite(vault.key)}
              />
              <Action
                title="Set as Active Vault"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "a" }}
                onAction={() => handleSetActive(vault.key)}
              />
              <ShowVaultInFinderAction vault={vault} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
