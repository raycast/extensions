import { getPreferenceValues } from "@raycast/api";
import { Vault } from "../vault.types";
import fs from "fs";

export function vaultPluginCheck(vaults: Vault[], plugin: string) {
  const vaultsWithoutPlugin: Vault[] = [];
  const { configFileName } = getPreferenceValues();
  vaults = vaults.filter((vault: Vault) => {
    const communityPluginsPath = `${vault.path}/${configFileName || ".obsidian"}/community-plugins.json`;
    if (!fs.existsSync(communityPluginsPath)) {
      vaultsWithoutPlugin.push(vault);
    } else {
      const plugins: string[] = JSON.parse(fs.readFileSync(communityPluginsPath, "utf-8"));

      if (plugins.includes(plugin)) {
        return vault;
      } else {
        vaultsWithoutPlugin.push(vault);
      }
    }
  });
  return [vaults, vaultsWithoutPlugin];
}
