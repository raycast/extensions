import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";

import { ObsidianVault } from "../types";

export function VaultSelection({
  vaults,
  onSelect,
  popAfterSelect = false,
}: {
  vaults: ObsidianVault[];
  onSelect: (vault: ObsidianVault) => void | Promise<void>;
  popAfterSelect?: boolean;
}) {
  const { pop } = useNavigation();

  async function select(vault: ObsidianVault) {
    await onSelect(vault);
    if (popAfterSelect) pop();
  }

  return (
    <List searchBarPlaceholder="Search vaults...">
      {vaults.map((vault) => (
        <List.Item
          key={vault.path}
          icon={Icon.Folder}
          title={vault.name}
          subtitle={vault.path}
          actions={
            <ActionPanel>
              <Action title="Use This Vault" icon={Icon.CheckCircle} onAction={() => select(vault)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
