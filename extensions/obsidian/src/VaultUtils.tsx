import { Preferences } from "./interfaces";
import { getPreferenceValues } from "@raycast/api";
import path from "path";

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

export function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }))
    .filter((vault) => !!vault);
}
