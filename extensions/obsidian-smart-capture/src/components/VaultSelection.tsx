import { Action, ActionPanel, List } from "@raycast/api";
import { ShowVaultInFinderAction } from "../utils/actions";

import { Vault } from "../utils/interfaces";

export function VaultSelection(props: { vaults: Vault[]; target: (vault: Vault) => never }) {
  const { vaults, target } = props;
  return (
    <List>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Push title="Select Vault" target={target(vault)} />
              <ShowVaultInFinderAction vault={vault} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
