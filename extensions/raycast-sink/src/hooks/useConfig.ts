import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Config, Preferences } from "../types";

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(() => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const newConfig: Config = {
        host: preferences.host,
        token: preferences.token,
        language: preferences.language || "en",
        showWebsitePreview: preferences.showWebsitePreview || "true",
      };
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

  const getConfigValue = useCallback(
    (key: keyof Config) => {
      return config ? config[key] : null;
    },
    [config],
  );

  return { config, isLoading, reloadConfig: loadConfig, getConfigValue };
}
