import { getPreferenceValues } from "@raycast/api";
import { useCallback, useState } from "react";
import { Config, Preferences } from "../types";

const getConfig = (): Config => {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return {
      apiUrl: preferences.apiUrl,
      apiKey: preferences.apiKey,
      language: preferences.language || "en",
      showWebsitePreview: preferences.showWebsitePreview,
      linkMainAction: preferences.linkMainAction || "openInBrowser",
      textMainAction: preferences.textMainAction || "viewDetail",
      createBookmarkType: preferences.createBookmarkType || "link",
      displayBookmarkPreview: preferences.displayBookmarkPreview ?? true,
      displayTags: preferences.displayTags ?? true,
      displayCreatedAt: preferences.displayCreatedAt ?? true,
      displayDescription: preferences.displayDescription ?? true,
      displayNote: preferences.displayNote ?? false,
      displayBookmarkStatus: preferences.displayBookmarkStatus ?? false,
      displaySummary: preferences.displaySummary ?? false,
    };
  } catch (error) {
    console.error("Config load failed:", error);
    return {
      apiUrl: "",
      apiKey: "",
      language: "en",
      showWebsitePreview: true,
      linkMainAction: "viewDetail",
      textMainAction: "viewDetail",
      createBookmarkType: "link",
      displayBookmarkPreview: true,
      displayTags: true,
      displayCreatedAt: true,
      displayDescription: true,
      displayNote: false,
      displayBookmarkStatus: false,
      displaySummary: false,
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
