import { List, ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { Vault } from "./interfaces";
import { parseVaults } from "./VaultUtils";
import fs from "fs";

export default function Command() {
  let vaults = parseVaults();
  const vaultsWithoutPlugin: Array<Vault> = [];
  vaults = vaults.filter((vault: Vault) => {
    const communityPluginsPath = vault.path + "/.obsidian/community-plugins.json";
    if (!fs.existsSync(communityPluginsPath)) {
      vaultsWithoutPlugin.push(vault);
    } else {
      const plugins: Array<string> = JSON.parse(fs.readFileSync(communityPluginsPath, "utf-8"));

      if (plugins.includes("obsidian-advanced-uri")) {
        return vault;
      } else {
        vaultsWithoutPlugin.push(vault);
      }
    }
  });

  if (vaultsWithoutPlugin.length > 0) {
    showToast({
      title: "Vaults without Daily Note plugin:",
      message: vaultsWithoutPlugin.map((vault: Vault) => vault.name).join(", "),
      style: Toast.Style.Failure,
    });
  }

  if (vaults.length == 0) {
    const text =
      "# Advanced URI plugin not installed.\nThis command requires the [Advanced URI plugin](https://obsidian.md/plugins?id=obsidian-advanced-uri) for Obsidian.  \n  \n Install it through the community plugins list.";

    return <Detail navigationTitle="Advanced URI plugin not installed" markdown={text} />;
  }

  return (
    <List isLoading={vaults === undefined}>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open
                title="Daily Note"
                target={"obsidian://advanced-uri?vault=" + encodeURIComponent(vault.name) + "&daily=true"}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
