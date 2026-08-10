import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { failureToastOptions } from "../utils/aerospace";
import { loadConfig, extractShortcuts } from "../utils/config";

export function useConfig() {
  return useCachedPromise(loadConfig, [], {
    failureToastOptions: failureToastOptions("Failed to load Aerospace config"),
  });
}

export function useShortcuts() {
  const { data: config, isLoading, error } = useConfig();
  const shortcuts = useMemo(() => (config ? extractShortcuts(config) : []), [config]);
  return { shortcuts, isLoading, error };
}
