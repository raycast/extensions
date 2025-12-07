import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useObsidianVaults } from "./utils/hooks";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { useEffect, useState } from "react";
import {
  EnhancedVault,
  enhanceVaults,
  sortVaults,
  getVaultDisplayName,
  getVaultAbbreviation,
  saveVaultMetadata,
  toggleVaultFavorite,
  VaultMetadata,
} from "./utils/vault-config";
import {
  setActiveVault,
  getActiveVaultKey,
  clearActiveVault,
} from "./utils/vault-context";
import { ShowVaultInFinderAction } from "./utils/actions";
import { Form } from "@raycast/api";

function EditVaultForm(props: { vault: EnhancedVault; onSave: () => void }) {
  const { vault, onSave } = props;
  const { pop } = useNavigation();
  const [displayName, setDisplayName] = useState(
    vault.metadata.displayName || ""
  );
  const [abbreviation, setAbbreviation] = useState(
    vault.metadata.abbreviation || ""
  );
  const [emoji, setEmoji] = useState(vault.metadata.emoji || "");
  const [color, setColor] = useState(vault.metadata.color || Color.Blue);

  async function handleSubmit() {
    const metadata: VaultMetadata = {
      ...vault.metadata,
      displayName: displayName.trim() || undefined,
      abbreviation: abbreviation.trim() || undefined,
      emoji: emoji.trim() || undefined,
      color: color,
    };

    await saveVaultMetadata(metadata);
    await showToast({
      style: Toast.Style.Success,
      title: "Vault Updated",
      message: `Updated settings for ${vault.name}`,
    });

    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Customize display settings for ${vault.name}`} />

      <Form.TextField
        id="displayName"
        title="Display Name"
        placeholder={vault.name}
        value={displayName}
        onChange={setDisplayName}
        info="Custom name to display (leave empty to use folder name)"
      />

      <Form.TextField
        id="emoji"
        title="Emoji Prefix"
        placeholder="📝"
        value={emoji}
        onChange={setEmoji}
        info="Optional emoji to show before the vault name"
      />

      <Form.TextField
        id="abbreviation"
        title="Abbreviation"
        placeholder="W"
        value={abbreviation}
        onChange={setAbbreviation}
        info="Short form for compact displays (leave empty for auto-generated)"
      />

      <Form.Dropdown
        id="color"
        title="Badge Color"
        value={color}
        onChange={(newValue) => setColor(newValue as Color)}
      >
        <Form.Dropdown.Item value={Color.Blue} title="Blue" />
        <Form.Dropdown.Item value={Color.Green} title="Green" />
        <Form.Dropdown.Item value={Color.Orange} title="Orange" />
        <Form.Dropdown.Item value={Color.Purple} title="Purple" />
        <Form.Dropdown.Item value={Color.Red} title="Red" />
        <Form.Dropdown.Item value={Color.Yellow} title="Yellow" />
        <Form.Dropdown.Item value={Color.Magenta} title="Magenta" />
        <Form.Dropdown.Item value={Color.SecondaryText} title="Gray" />
      </Form.Dropdown>

      <Form.Description
        text={`
Preview: ${emoji || ""} ${displayName || vault.name}
Badge: [${abbreviation || getVaultAbbreviation(vault)}]
Path: ${vault.path}
        `.trim()}
      />
    </Form>
  );
}

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

  async function handleToggleFavorite(vaultKey: string) {
    const isFavorite = await toggleVaultFavorite(vaultKey);
    await showToast({
      style: Toast.Style.Success,
      title: isFavorite ? "Added to Favorites" : "Removed from Favorites",
    });
    await loadVaults();
  }

  async function handleSetActive(vaultKey: string) {
    await setActiveVault(vaultKey);
    setActiveVaultKey(vaultKey);
    await showToast({
      style: Toast.Style.Success,
      title: "Active Vault Set",
    });
    await loadVaults();
  }

  async function handleClearActive() {
    await clearActiveVault();
    setActiveVaultKey(null);
    await showToast({
      style: Toast.Style.Success,
      title: "Active Vault Cleared",
    });
  }

  function getVaultStats(vault: EnhancedVault): string {
    const stats: string[] = [];

    if (vault.metadata.isFavorite) {
      stats.push("Favorite");
    }

    if (activeVaultKey === vault.key) {
      stats.push("Active");
    }

    if (stats.length > 0) {
      return stats.join(" • ");
    }

    return "";
  }

  function getAccessories(vault: EnhancedVault): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];

    if (vault.metadata.isFavorite) {
      accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
    }

    if (activeVaultKey === vault.key) {
      accessories.push({ icon: Icon.CheckCircle, tooltip: "Active Vault" });
    }

    // Badge preview
    accessories.push({
      tag: {
        value: getVaultAbbreviation(vault),
        color: vault.metadata.color || Color.SecondaryText,
      },
    });

    return accessories;
  }

  if (!ready || isLoading) {
    return <List isLoading={true} />;
  }

  if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  return (
    <List>
      <List.Section
        title="Vaults"
        subtitle={`${vaults.length} vault${vaults.length !== 1 ? "s" : ""}`}
      >
        {enhancedVaults.map((vault) => (
          <List.Item
            key={vault.key}
            title={getVaultDisplayName(vault)}
            subtitle={getVaultStats(vault)}
            accessories={getAccessories(vault)}
            icon={
              vault.metadata.color
                ? { source: Icon.Folder, tintColor: vault.metadata.color }
                : Icon.Folder
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Vault Settings"
                  icon={Icon.Pencil}
                  target={<EditVaultForm vault={vault} onSave={loadVaults} />}
                />
                <Action
                  title={
                    vault.metadata.isFavorite
                      ? "Remove from Favorites"
                      : "Add to Favorites"
                  }
                  icon={
                    vault.metadata.isFavorite ? Icon.StarDisabled : Icon.Star
                  }
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleToggleFavorite(vault.key)}
                />
                <Action
                  title="Set as Active Vault"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  onAction={() => handleSetActive(vault.key)}
                />
                {activeVaultKey && (
                  <Action
                    title="Clear Active Vault"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={handleClearActive}
                  />
                )}
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
    </List>
  );
}
