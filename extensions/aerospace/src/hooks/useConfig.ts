import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { failureToastOptions } from "../utils/aerospace";
import { extractShortcuts, loadConfig, loadConfigSnapshot } from "../utils/config";

export function useConfigSnapshot() {
  return useCachedPromise(loadConfigSnapshot, [], {
    failureToastOptions: failureToastOptions("Failed to Load AeroSpace Config"),
  });
}

export function useShortcuts() {
  const {
    data: config,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(loadConfig, [], {
    failureToastOptions: failureToastOptions("Failed to Load AeroSpace Shortcuts"),
  });
  const shortcuts = useMemo(() => (config ? extractShortcuts(config) : []), [config]);
  return { shortcuts, isLoading, error, revalidate };
}
