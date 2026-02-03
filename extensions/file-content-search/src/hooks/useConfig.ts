import { homedir } from "node:os";
import { useCachedState } from "@raycast/utils";
import { DEFAULT_MAX_RESULTS, preferences } from "../constants";
import type { Config } from "../types";

const CONFIG_STORAGE_KEY = "search-config-v1";

const getDefaultConfig = (): Config => ({
  useRegex: preferences.defaultUseRegex ?? false,
  searchPath: preferences.defaultSearchPath || homedir(),
  timeout: 15,
  maxResults: DEFAULT_MAX_RESULTS,
});

type UseConfigResult = {
  config: Config;
  updateConfig: (updates: Partial<Config>) => void;
  resetConfig: () => void;
};

/**
 * Hook to manage search configuration state.
 * @returns Object containing config state, updateConfig function for partial updates, and resetConfig to restore defaults
 */
export const useConfig = (): UseConfigResult => {
  const defaultConfig = getDefaultConfig();
  const [config, setConfig] = useCachedState<Config>(CONFIG_STORAGE_KEY, defaultConfig);

  const updateConfig = (updates: Partial<Config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig(getDefaultConfig());
  };

  return { config, updateConfig, resetConfig };
};
