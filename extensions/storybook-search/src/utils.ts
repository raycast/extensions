import { LocalStorage } from "@raycast/api";
import { Config } from "./types";

export const CONFIG_STORAGE_KEY = "config";
const DEFAULT_CONFIG: Config = {
  baseUrl: "",
  nameFilterRegExp: "",
};

export const loadConfig = async (): Promise<Config> => {
  try {
    const configStr = await LocalStorage.getItem(CONFIG_STORAGE_KEY);
    if (!configStr) return DEFAULT_CONFIG;

    const config = JSON.parse(configStr.toString());
    return Object.fromEntries(Object.entries(DEFAULT_CONFIG).map(([k, v]) => [k, config[k] ?? v])) as Config;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveConfig = async (config: Config): Promise<void> => {
  await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};
