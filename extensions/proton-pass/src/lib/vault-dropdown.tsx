import { Icon, List } from "@raycast/api";
import { titleWithCount, totalItemCount } from "./item-counts";
import { isSharedWithMe, SHARED_WITH_ME } from "./shared-items";
import { compareVaultNames } from "./sort";
import { Vault } from "./types";

export const ALL_VAULTS_VALUE = "all";

interface VaultDropdownProps {
  vaults: Vault[];
  /** Number of items in each vault, once known. */
  itemCounts: Map<string, number>;
  /** Vault to show, for a vault opened from the vault list. Otherwise the command's last selection is restored. */
  value?: string;
  onVaultChange: (vaultId: string) => void;
}

/** The vault menu of Browse Items and Get TOTP Code: All Vaults, each vault, then Shared with Me. */
export function VaultDropdown({ vaults, itemCounts, value, onVaultChange }: VaultDropdownProps) {
  // By name: Sort vaults by is List Vaults' preference, which other commands can't read.
  const listedVaults = vaults.filter((vault) => !isSharedWithMe(vault)).sort(compareVaultNames);
  // The selected item's title stays in the search bar, so the count of the vault shown is always visible.
  return (
    <List.Dropdown
      tooltip="Select Vault"
      storeValue={value === undefined}
      value={value}
      defaultValue={value === undefined ? ALL_VAULTS_VALUE : undefined}
      onChange={onVaultChange}
    >
      <List.Dropdown.Item
        title={titleWithCount("All Vaults", totalItemCount(vaults, itemCounts))}
        value={ALL_VAULTS_VALUE}
        icon={Icon.Globe}
      />
      <List.Dropdown.Section title="Vaults">
        {listedVaults.map((vault) => (
          <List.Dropdown.Item
            key={vault.shareId}
            title={titleWithCount(vault.name, itemCounts.get(vault.shareId))}
            value={vault.shareId}
            icon={Icon.Folder}
          />
        ))}
      </List.Dropdown.Section>
      {vaults.some(isSharedWithMe) && (
        <List.Dropdown.Section>
          <List.Dropdown.Item
            title={titleWithCount(SHARED_WITH_ME.name, itemCounts.get(SHARED_WITH_ME.shareId))}
            value={SHARED_WITH_ME.shareId}
            icon={Icon.TwoPeople}
          />
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
