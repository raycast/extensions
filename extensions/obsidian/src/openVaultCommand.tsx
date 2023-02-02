import { Action, ActionPanel, closeMainWindow, List, open, popToRoot, Icon } from "@raycast/api";

import { getOpenVaultTarget, useObsidianVaults } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { ShowVaultInFinderAction } from "./utils/actions";

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (vaults.length === 1) {
    open(getOpenVaultTarget(vaults[0]));
    popToRoot();
    closeMainWindow();
  }

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length == 1) {
    open(getOpenVaultTarget(vaults[0]));
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
                <Action.Open title="Open vault" icon={Icon.ArrowRight} target={getOpenVaultTarget(vault)} />
                <ShowVaultInFinderAction vault={vault} />
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
