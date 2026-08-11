import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Config } from "../types";

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(() => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const newConfig: Config = preferences;
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

  return { config, isLoading };
}
