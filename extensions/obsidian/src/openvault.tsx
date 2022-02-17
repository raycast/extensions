import { List, ActionPanel, OpenAction, getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";

interface Preferences {
  vaultPath: string;
}

interface Vault {
  name: string;
  key: string;
  path: string;
}

function getVaultNameFromPath(vaultPath: string): string {
  const name = vaultPath
    .split(path.sep)
    .filter((i) => {
      if (i != "") {
        return i;
      }
    })
    .pop();
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }))
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
