import { useState, useEffect, useCallback } from "react";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { CONFIG_INITIALIZED_KEY } from "../constants";
import { Config, Preferences } from "../types";
const CONFIG_KEYS: (keyof Config)[] = ["host", "token", "showWebsitePreview", "language"];

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadConfig = useCallback(async () => {
    try {
      const initialized = await LocalStorage.getItem(CONFIG_INITIALIZED_KEY);

      if (!initialized) {
        const preferences = getPreferenceValues<Preferences>();
        await Promise.all([
          LocalStorage.setItem("host", preferences.host),
          LocalStorage.setItem("token", preferences.token),
          LocalStorage.setItem("language", preferences.language || "en"),
          LocalStorage.setItem("showWebsitePreview", preferences.showWebsitePreview || "true"),
          LocalStorage.setItem(CONFIG_INITIALIZED_KEY, "true"),
        ]);
      }

      const newConfig = (await Promise.all(
        CONFIG_KEYS.map(async (key) => [key, await LocalStorage.getItem<string>(key)]),
      ).then(Object.fromEntries)) as Config;

      newConfig.showWebsitePreview = newConfig.showWebsitePreview || "true";
      newConfig.language = newConfig.language || "en";
      setConfig(newConfig);
    } catch (error) {
      console.error("Config validation failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(
    async (newConfig: Partial<Config>) => {
      if (config) {
        const updatedConfig = { ...config, ...newConfig };
        setConfig(updatedConfig);

        await Promise.all(
          Object.entries(updatedConfig).map(([key, value]) => LocalStorage.setItem(key, value.toString())),
        );
      }
    },
    [config],
  );

  const getConfigValue = useCallback(
    (key: keyof Config) => {
      return config ? config[key] : null;
    },
    [config],
  );

  return { config, isLoading, updateConfig, reloadConfig: loadConfig, getConfigValue };
}
