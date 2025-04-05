import { List, ActionPanel, Action } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";
import { ReactNode } from "@raycast/api/node_modules/@types/react";
import { ShowVaultInFinderAction } from "../utils/actions";

export function VaultSelection(props: { vaults: Vault[]; target: (vault: Vault) => ReactNode }) {
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
