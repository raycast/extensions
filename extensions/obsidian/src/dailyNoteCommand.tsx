import { List, ActionPanel, OpenAction, showToast, ToastStyle, Detail } from "@raycast/api";
import { Vault } from "./interfaces";
import { parseVaults } from "./VaultUtils";
import fs from "fs";

export default function Command() {
  let vaults = parseVaults();
  vaults = vaults.filter((vault: Vault) => {
    const plugins: Array<string> = JSON.parse(
      fs.readFileSync(vault.path + "/.obsidian/community-plugins.json", "utf-8")
    );
    if (plugins.includes("obsidian-advanced-uri")) {
      return vault;
    }
  });

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
              <OpenAction
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
