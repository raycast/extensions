import { getPreferenceValues } from "@raycast/api";
import { useCallback, useState } from "react";
import { Config, Preferences } from "../types";

const getConfig = (): Config => {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return {
      host: preferences.host,
      apiKey: preferences.apiKey,
      language: preferences.language || "en",
      showWebsitePreview: preferences.showWebsitePreview,
    };
  } catch (error) {
    console.error("Config load failed:", error);
    return {
      host: "",
      apiKey: "",
      language: "en",
      showWebsitePreview: true,
    };
  }
};

export function useConfig() {
  const [config, setConfig] = useState<Config>(getConfig);
  const [isLoading, setIsLoading] = useState(false);

  const reloadConfig = useCallback(() => {
    setIsLoading(true);
    setConfig(getConfig());
    setIsLoading(false);
  }, []);

  return {
    config,
    isLoading,
    reloadConfig,
    getConfigValue: useCallback((key: keyof Config) => config[key], [config]),
  };
}
