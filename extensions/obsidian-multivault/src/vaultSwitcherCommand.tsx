import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import { useObsidianVaults } from "./utils/hooks";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { useEffect, useState } from "react";
import {
  EnhancedVault,
  enhanceVaults,
  sortVaults,
  getVaultDisplayName,
} from "./utils/vault-config";
import { setActiveVault, getActiveVaultKey } from "./utils/vault-context";
import { ShowVaultInFinderAction } from "./utils/actions";
import { open } from "@raycast/api";
import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const [enhancedVaults, setEnhancedVaults] = useState<EnhancedVault[]>([]);
  const [activeVaultKey, setActiveVaultKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadVaults() {
    setIsLoading(true);
    const enhanced = await enhanceVaults(vaults);
    const sorted = sortVaults(enhanced);
    setEnhancedVaults(sorted);

    const active = await getActiveVaultKey();
    setActiveVaultKey(active);

    setIsLoading(false);
  }

  useEffect(() => {
    if (ready && vaults.length > 0) {
      loadVaults();
    } else if (ready) {
      setIsLoading(false);
    }
  }, [ready, vaults]);

  async function handleSetActiveAndClose(vaultKey: string) {
    await setActiveVault(vaultKey);
    await showToast({
      style: Toast.Style.Success,
      title: "Active Vault Changed",
    });
    await closeMainWindow();
  }

  async function handleOpenVault(vault: EnhancedVault) {
    await setActiveVault(vault.key);
    const target = getObsidianTarget({
      type: ObsidianTargetType.OpenVault,
      vault,
    });
    await open(target);
    await showToast({
      style: Toast.Style.Success,
      title: `Opening ${getVaultDisplayName(vault)}`,
    });
    await closeMainWindow();
  }

  function getAccessories(vault: EnhancedVault): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];

    // Favorite star
    if (vault.metadata.isFavorite) {
      accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
    }

    // Active vault indicator
    if (activeVaultKey === vault.key) {
      accessories.push({ icon: Icon.CheckCircle, tooltip: "Active Vault" });
    }

    // Last accessed
    if (vault.metadata.lastAccessed.getTime() > 0) {
      const now = new Date();
      const diff = now.getTime() - vault.metadata.lastAccessed.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        accessories.push({ text: "Today", tooltip: "Last accessed today" });
      } else if (days === 1) {
        accessories.push({
          text: "Yesterday",
          tooltip: "Last accessed yesterday",
        });
      } else if (days < 7) {
        accessories.push({
          text: `${days}d ago`,
          tooltip: `Last accessed ${days} days ago`,
        });
      } else if (days < 30) {
        const weeks = Math.floor(days / 7);
        accessories.push({
          text: `${weeks}w ago`,
          tooltip: `Last accessed ${weeks} week${weeks !== 1 ? "s" : ""} ago`,
        });
      }
    }

    return accessories;
  }

  function getSubtitle(vault: EnhancedVault): string {
    const parts: string[] = [];

    if (vault.metadata.displayName) {
      parts.push(`Folder: ${vault.name}`);
    }

    return parts.join(" • ");
  }

  if (!ready || isLoading) {
    return <List isLoading={true} />;
  }

  if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  // Group vaults into favorites and others
  const favorites = enhancedVaults.filter((v) => v.metadata.isFavorite);
  const others = enhancedVaults.filter((v) => !v.metadata.isFavorite);

  return (
    <List searchBarPlaceholder="Search vaults...">
      {favorites.length > 0 && (
        <List.Section
          title="Favorites"
          subtitle={`${favorites.length} vault${
            favorites.length !== 1 ? "s" : ""
          }`}
        >
          {favorites.map((vault) => (
            <List.Item
              key={vault.key}
              title={getVaultDisplayName(vault)}
              subtitle={getSubtitle(vault)}
              accessories={getAccessories(vault)}
              icon={
                vault.metadata.color
                  ? { source: Icon.Folder, tintColor: vault.metadata.color }
                  : Icon.Folder
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Active Vault"
                    icon={Icon.CheckCircle}
                    onAction={() => handleSetActiveAndClose(vault.key)}
                  />
                  <Action
                    title="Open in Obsidian"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleOpenVault(vault)}
                  />
                  <ShowVaultInFinderAction vault={vault} />
                  <Action.CopyToClipboard
                    title="Copy Vault Path"
                    content={vault.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {others.length > 0 && (
        <List.Section
          title={favorites.length > 0 ? "Other Vaults" : "All Vaults"}
          subtitle={`${others.length} vault${others.length !== 1 ? "s" : ""}`}
        >
          {others.map((vault) => (
            <List.Item
              key={vault.key}
              title={getVaultDisplayName(vault)}
              subtitle={getSubtitle(vault)}
              accessories={getAccessories(vault)}
              icon={
                vault.metadata.color
                  ? { source: Icon.Folder, tintColor: vault.metadata.color }
                  : Icon.Folder
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Active Vault"
                    icon={Icon.CheckCircle}
                    onAction={() => handleSetActiveAndClose(vault.key)}
                  />
                  <Action
                    title="Open in Obsidian"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleOpenVault(vault)}
                  />
                  <ShowVaultInFinderAction vault={vault} />
                  <Action.CopyToClipboard
                    title="Copy Vault Path"
                    content={vault.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
