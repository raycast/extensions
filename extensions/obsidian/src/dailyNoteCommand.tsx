import { Action, ActionPanel, closeMainWindow, Detail, List, open, popToRoot, showToast, Toast } from "@raycast/api";

import { Vault } from "./utils/interfaces";
import { useObsidianVaults, vaultPluginCheck } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";

const getTarget = (vaultName: string) => {
  return "obsidian://advanced-uri?vault=" + encodeURIComponent(vaultName) + "&daily=true";
};

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");

  if (vaultsWithoutPlugin.length > 0) {
    showToast({
      title: "Vaults without Daily Note plugin:",
      message: vaultsWithoutPlugin.map((vault: Vault) => vault.name).join(", "),
      style: Toast.Style.Failure,
    });
  }

  if (vaultsWithPlugin.length == 0) {
    const text =
      "# Advanced URI plugin not installed.\nThis command requires the [Advanced URI plugin](https://obsidian.md/plugins?id=obsidian-advanced-uri) for Obsidian.  \n  \n Install it through the community plugins list.";

    return <Detail navigationTitle="Advanced URI plugin not installed" markdown={text} />;
  }

  if (vaultsWithPlugin.length == 1) {
    open(getTarget(vaultsWithPlugin[0].name));
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
              <Action.Open title="Daily Note" target={getTarget(vault.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
