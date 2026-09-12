import { ObsidianVault } from "@/obsidian";
import { Action, ActionPanel, List } from "@raycast/api";
import { ShowVaultInFinderAction, CopyVaultPathAction } from "../utils/actions";

export function VaultSelection(props: { vaults: ObsidianVault[]; target: (vault: ObsidianVault) => React.ReactNode }) {
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
              <CopyVaultPathAction vault={vault} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
