import { List, ActionPanel, OpenAction } from "@raycast/api";
import { parseVaults } from "./VaultUtils";

export default function Command() {
  const vaults = parseVaults();

  return (
    <List isLoading={vaults === undefined}>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <OpenAction title="Open vault" target={"obsidian://open?vault=" + encodeURIComponent(vault.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
