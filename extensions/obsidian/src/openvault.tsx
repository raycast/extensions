import {
  List,
  ActionPanel,
  OpenAction,
  getPreferenceValues,
  showToast,
  ToastStyle
} from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  vaults: String;
}

interface Vault {
  name: string;
  key: number;
}

function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultstring = pref.vaults
  let vaults = [];

  if (vaultstring) {
    const strings = vaultstring.split(",");
    for (let i = 0; i < strings.length; i++) {
      vaults.push({
        name: strings[i].trim(),
        key: i
      });
    }
    return vaults;
  } else {
    showToast(ToastStyle.Failure, "There are no vaults")
    return [];
  }
}


export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>();

  useEffect(() => {
    async function fetch() {
      let vaults = parseVaults()
      setVaults(vaults)
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
              <OpenAction
                title="Open vault"
                target={"obsidian://open?vault=" + encodeURIComponent(vault.name)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
