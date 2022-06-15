import { List, ActionPanel, Action, open, popToRoot, closeMainWindow } from "@raycast/api";

import { parseVaults } from "./utils/utils";

const getTarget = (vaultName: string) => {
  return "obsidian://open?vault=" + encodeURIComponent(vaultName);
};

export default function Command() {
  const vaults = parseVaults();

  if (vaults.length == 1) {
    open(getTarget(vaults[0].name));
    popToRoot();
    closeMainWindow();
  }

  return (
    <List isLoading={vaults === undefined}>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open title="Open vault" target={getTarget(vault.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
