import { Action, ActionPanel, closeMainWindow, List, open, popToRoot, Icon } from "@raycast/api";

import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { Obsidian, ObsidianTargetType } from "@/obsidian";
import { ShowVaultInFinderAction, CopyVaultPathAction } from "./utils/actions";
import { useObsidianVaults } from "./utils/hooks";
import { simplifyHomePath } from "./utils/utils";

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (vaults.length === 1) {
    open(Obsidian.getTarget({ type: ObsidianTargetType.OpenVault, vault: vaults[0] }));
    popToRoot();
    closeMainWindow();
  }

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length == 1) {
    open(Obsidian.getTarget({ type: ObsidianTargetType.OpenVault, vault: vaults[0] }));
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
            accessories={[{ text: simplifyHomePath(vault.path) }]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open Vault"
                  icon={Icon.ArrowRight}
                  target={Obsidian.getTarget({ type: ObsidianTargetType.OpenVault, vault: vault })}
                />
                <ShowVaultInFinderAction vault={vault} />
                <CopyVaultPathAction vault={vault} />
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
