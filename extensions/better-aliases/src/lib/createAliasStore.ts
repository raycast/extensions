import { environment, getPreferenceValues } from "@raycast/api";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { betterAliasesConfigSchema, type BetterAliasesConfig, type BetterAliasItem } from "../schemas";
import type { Preferences } from "../schemas";
import { createConfigManager } from "./configManager";

function ensureConfigExists(targetPath: string) {
  if (existsSync(targetPath)) return;

  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const defaultAssetPath = resolve(environment.assetsPath, "examples/config.json");

  try {
    if (existsSync(defaultAssetPath)) {
      copyFileSync(defaultAssetPath, targetPath);
    }
  } catch (error) {
    console.error("Failed to initialize config:", error);
  }
}

export function createAliasStore(configKey: keyof Preferences, defaultFilename: string) {
  const getPath = () => {
    const preferences = getPreferenceValues<Preferences>();
    const prefValue = preferences[configKey];

    if (typeof prefValue === "string" && prefValue.trim()) {
      return prefValue;
    }

    const ret = resolve(environment.supportPath, defaultFilename);
    ensureConfigExists(ret);

    return ret;
  };

  const manager = createConfigManager<BetterAliasesConfig>({
    getConfigPath: getPath,
    defaultValue: {},
    schema: betterAliasesConfigSchema,
  });

  return {
    load: manager.load,
    loadAsync: manager.loadAsync,
    save: manager.save,
    getPath: manager.getPath,
    add: (alias: string, item: BetterAliasItem) => {
      const config = manager.load();
      if (config[alias]) throw new Error(`"${alias}" already exists`);
      config[alias] = item;
      manager.save(config);
    },
    delete: (alias: string) => {
      const config = manager.load();
      if (config[alias]) {
        delete config[alias];
        manager.save(config);
      }
    },
    update: (alias: string, item: BetterAliasItem) => {
      const config = manager.load();
      config[alias] = item;
      manager.save(config);
    },
  };
}
