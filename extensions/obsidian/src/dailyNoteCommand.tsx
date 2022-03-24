import { List, ActionPanel, OpenAction, showToast, ToastStyle } from "@raycast/api";
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
    showToast(
      ToastStyle.Failure,
      "Advanced URI plugin not installed.",
      "This command requires the Advanced URI plugin for Obsidian. Install it through the community plugins list."
    );
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
