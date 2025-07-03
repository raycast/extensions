import { getPreferenceValues } from "@raycast/api";
import { Vault } from "../vault.types";
import fs from "fs";

export function vaultPluginCheck(vaults: Vault[], plugin: string) {
  const { configFileName } = getPreferenceValues();

  const vaultsWithoutPlugin: Vault[] = [];
  const vaultsWithPlugin = vaults.filter((vault: Vault) => {
    const communityPluginsPath = `${vault.path}/${configFileName || ".obsidian"}/community-plugins.json`;

    if (!fs.existsSync(communityPluginsPath)) {
      vaultsWithoutPlugin.push(vault);
      return false;
    }

    const plugins: string[] = JSON.parse(fs.readFileSync(communityPluginsPath, "utf-8"));
    const hasPlugin = plugins.includes(plugin);

    if (!hasPlugin) {
      vaultsWithoutPlugin.push(vault);
    }
    return hasPlugin;
  });
  return [vaultsWithPlugin, vaultsWithoutPlugin];
}
