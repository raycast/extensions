import { useCachedPromise } from "@raycast/utils";
import { loadConfig, extractShortcuts } from "../utils/config";

export function useConfig() {
  return useCachedPromise(loadConfig);
}

export function useShortcuts() {
  const { data: config, isLoading, error } = useConfig();
  const shortcuts = config ? extractShortcuts(config) : [];
  return { shortcuts, isLoading, error };
}
