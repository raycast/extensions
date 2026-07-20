import { open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadConfig, extractShortcuts } from "../utils/config";

export function useConfig() {
  return useCachedPromise(loadConfig, [], {
    failureToastOptions: {
      title: "Failed to load Aerospace config",
      primaryAction: {
        title: "Install Aerospace",
        onAction: (toast) => {
          open("https://nikitabobko.github.io/AeroSpace/guide#installation");
          toast.hide();
        },
      },
    },
  });
}

export function useShortcuts() {
  const { data: config, isLoading, error } = useConfig();
  const shortcuts = config ? extractShortcuts(config) : [];
  return { shortcuts, isLoading, error };
}
