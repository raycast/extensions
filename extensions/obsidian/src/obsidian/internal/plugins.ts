import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { Logger } from "../../api/logger/logger.service";
import { ObsidianVault } from "./vault";

const logger: Logger = new Logger("Plugins");

export interface VaultPluginCheckParams {
  vaults: ObsidianVault[];
  communityPlugins?: string[];
  corePlugins?: string[];
}

export interface VaultPluginCheckResult {
  vaultsWithPlugin: ObsidianVault[];
  vaultsWithoutPlugin: ObsidianVault[];
  cacheable: boolean;
}

export function readCommunityPlugins(vaultPath: string): string[] | undefined {
  const { configFileName } = getPreferenceValues();
  const path = `${vaultPath}/${configFileName || ".obsidian"}/community-plugins.json`;
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, "utf-8");
  try {
    const plugins: string[] = JSON.parse(content);
    return plugins;
  } catch (error) {
    logger.error(`Failed to parse community-plugins.json for vault ${vaultPath}: ${error}`);
    return undefined;
  }
}

/** Reads the core-plugins.json file and returns a record with plugin name keys. The values
 * are booleans, indicating whether the plugin is enabled or not.
 */
export function readCorePlugins(vaultPath: string): Record<string, boolean> | undefined {
  const { configFileName } = getPreferenceValues();
  const path = `${vaultPath}/${configFileName || ".obsidian"}/core-plugins.json`;
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, "utf-8");
  try {
    const plugins: Record<string, boolean> = JSON.parse(content);
    return plugins;
  } catch (error) {
    logger.error(`Failed to parse core-plugins.json for vault ${vaultPath}: ${error}`);
    return undefined;
  }
}

export function vaultPluginCheck(params: VaultPluginCheckParams): VaultPluginCheckResult {
  const vaultsWithoutPlugin: ObsidianVault[] = [];
  let cacheable = true;
  const vaultsWithPlugin = params.vaults.filter((vault: ObsidianVault) => {
    const toCheckCommunityPlugins = params.communityPlugins;
    const toCheckCorePlugins = params.corePlugins;

    if (toCheckCommunityPlugins) {
      let plugins: string[] | undefined;
      try {
        plugins = readCommunityPlugins(vault.path);
      } catch (error) {
        logger.error(`Failed to read community-plugins.json for vault ${vault.path}: ${error}`);
        cacheable = false;
      }
      const availablePlugins = plugins;
      if (!availablePlugins || !toCheckCommunityPlugins.every((c) => availablePlugins.includes(c))) {
        vaultsWithoutPlugin.push(vault);
        return false;
      }
    }

    if (toCheckCorePlugins) {
      let plugins: Record<string, boolean> | undefined;
      try {
        plugins = readCorePlugins(vault.path);
      } catch (error) {
        logger.error(`Failed to read core-plugins.json for vault ${vault.path}: ${error}`);
        cacheable = false;
      }
      const availablePlugins = plugins;
      if (!availablePlugins || !toCheckCorePlugins.every((c) => c in availablePlugins && availablePlugins[c])) {
        vaultsWithoutPlugin.push(vault);
        return false;
      }
    }

    return true;
  });
  logger.info(`Vaults with requested plugins: ${vaultsWithPlugin.map((v) => v.name).join(", ")}`);
  return { vaultsWithPlugin, vaultsWithoutPlugin, cacheable };
}
