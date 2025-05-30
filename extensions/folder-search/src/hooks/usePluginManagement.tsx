import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { FolderSearchPlugin, SpotlightSearchPreferences } from "../types";
import { loadPlugins, log } from "../utils";

// Counter to track instances for debugging
let instanceCounter = 0;

/**
 * Hook for managing plugins
 */
export function usePluginManagement() {
  // Create a unique ID for this hook instance
  const instanceIdRef = useRef<number>(++instanceCounter);

  // Get current preferences
  const { pluginsEnabled } = getPreferenceValues<SpotlightSearchPreferences>();

  // Use Raycast's useCachedPromise for much simpler caching
  const { data: plugins = [], isLoading } = useCachedPromise(
    async () => {
      log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Loading plugins`, { pluginsEnabled });

      if (!pluginsEnabled) {
        log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Plugins are disabled in preferences`);
        return [];
      }

      return await loadPlugins(`Instance_${instanceIdRef.current}`);
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  // Log mount/unmount for debugging
  useEffect(() => {
    log("debug", "usePluginManagement", `Instance #${instanceIdRef.current} mounted`);

    return () => {
      log("debug", "usePluginManagement", `Instance #${instanceIdRef.current} unmounted`);
    };
  }, []);

  return {
    plugins,
    hasCheckedPlugins: !isLoading,
    pluginsEnabled,
  };
}
