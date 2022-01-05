import { List, ActionPanel, OpenAction, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  vaults: string;
}

interface Vault {
  name: string;
  key: string;
}

function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaults;
  return vaultString
    .split(",")
    .map((vault) => ({ name: vault.trim(), key: vault.trim() }))
    .filter((vault) => !!vault);
}

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>();

  useEffect(() => {
    async function fetch() {
      const vaults = parseVaults();
      setVaults(vaults);
    }
    fetch();
  }, []);

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
