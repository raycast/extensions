import { Action, ActionPanel, closeMainWindow, List, open, popToRoot, Icon } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";

const getTarget = (vaultName: string) => {
  return "obsidian://open?vault=" + encodeURIComponent(vaultName);
};

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (vaults.length === 1) {
    open(getTarget(vaults[0].name));
    popToRoot();
    closeMainWindow();
  }

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length == 1) {
    open(getTarget(vaults[0].name));
    popToRoot();
    closeMainWindow();
    return <List />;
  } else if (vaults.length > 1) {
    return (
      <List isLoading={!ready}>
        {vaults?.map((vault) => (
          <List.Item
            title={vault.name}
            key={vault.key}
            actions={
              <ActionPanel>
                <Action.Open title="Open vault" icon={Icon.ArrowRight} target={getTarget(vault.name)} />
                <Action.ShowInFinder title="Show in Finder" icon={Icon.Finder} path={vault.path} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    return <List />;
  }
}
