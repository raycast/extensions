import { Icon, List } from "@raycast/api";
import { useRef } from "react";
import { FolderEntry, folderEntryValue, PATH_SEPARATOR } from "./folders";
import { titleWithCount, totalItemCount } from "./item-counts";
import { isSharedWithMe, SHARED_WITH_ME } from "./shared-items";
import { VaultSortOrder, sortVaults, useVaultFrecency } from "./sort";
import { Vault } from "./types";

export const ALL_VAULTS_VALUE = "all";

interface VaultDropdownProps {
  vaults: Vault[];
  /** Number of items in each vault, once known. */
  itemCounts: Map<string, number>;
  /** Vault to show, for a vault opened from the vault list. Otherwise the command's last selection is restored. */
  value?: string;
  order: VaultSortOrder;
  /** The folders with items, listed after their vault. */
  folders?: FolderEntry[];
  /** Gets a vault's share ID, Shared with Me's, a folder's value (see folderValue) or ALL_VAULTS_VALUE. */
  onVaultChange: (vaultId: string) => void;
}

/** The vault menu of Browse Items and Get TOTP Code: All Vaults, each vault followed by its folders, then Shared with Me. */
export function VaultDropdown({ vaults, itemCounts, value, order, folders = [], onVaultChange }: VaultDropdownProps) {
  const unsortedVaults = vaults.filter((vault) => !isSharedWithMe(vault));
  const { data: mostUsed, visitItem } = useVaultFrecency(unsortedVaults);
  const listedVaults = sortVaults(unsortedVaults, order, (vault) => itemCounts.get(vault.shareId), mostUsed);
  // Raycast also reports the vault it opens on, restored or given: only a choice made here counts as a use.
  const hasReportedFirst = useRef(false);
  function onChange(vaultId: string) {
    const vault = unsortedVaults.find((entry) => entry.shareId === vaultId);
    if (hasReportedFirst.current && vault) visitItem(vault);
    hasReportedFirst.current = true;
    onVaultChange(vaultId);
  }
  // The selected item's title stays in the search bar, so the count of the vault shown is always visible.
  return (
    <List.Dropdown
      tooltip="Select Vault or Folder"
      storeValue={value === undefined}
      value={value}
      defaultValue={value === undefined ? ALL_VAULTS_VALUE : undefined}
      onChange={onChange}
    >
      <List.Dropdown.Item
        title={titleWithCount("All Vaults", totalItemCount(vaults, itemCounts))}
        value={ALL_VAULTS_VALUE}
        icon={Icon.Globe}
      />
      <List.Dropdown.Section title="Vaults">
        {listedVaults.flatMap((vault) => [
          <List.Dropdown.Item
            key={vault.shareId}
            title={titleWithCount(vault.name, itemCounts.get(vault.shareId))}
            value={vault.shareId}
            icon={Icon.Box}
          />,
          ...folders
            .filter((folder) => folder.shareId === vault.shareId)
            .map((folder) => (
              <List.Dropdown.Item
                key={folderEntryValue(folder)}
                title={titleWithCount(
                  [vault.name, ...folder.path.map(({ name }) => name)].join(PATH_SEPARATOR),
                  folder.itemCount,
                )}
                value={folderEntryValue(folder)}
                icon={Icon.Folder}
              />
            )),
        ])}
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
