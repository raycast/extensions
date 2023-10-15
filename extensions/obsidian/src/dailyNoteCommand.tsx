import { Action, ActionPanel, closeMainWindow, List, open, popToRoot } from "@raycast/api";

import { getDailyNoteTarget, useObsidianVaults, vaultPluginCheck } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");

  if (vaultsWithoutPlugin.length > 0) {
    vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin);
  }
  if (vaultsWithPlugin.length == 0) {
    return <AdvancedURIPluginNotInstalled />;
  }

  if (vaultsWithPlugin.length == 1) {
    open(getDailyNoteTarget(vaultsWithPlugin[0]));
    popToRoot();
    closeMainWindow();
  }

  return (
    <List isLoading={vaultsWithPlugin === undefined}>
      {vaultsWithPlugin?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open title="Daily Note" target={getDailyNoteTarget(vault)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
