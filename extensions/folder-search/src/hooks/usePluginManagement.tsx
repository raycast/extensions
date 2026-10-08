import { useEffect, useRef, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { SpotlightSearchPreferences } from "../types";
import { loadPlugins, log } from "../utils";

// Counter to track instances for debugging
let instanceCounter = 0;

/**
 * Hook for managing plugins
 */
export function usePluginManagement() {
  // Create a stable instance ID that won't change between renders
  const instanceIdRef = useRef<number>(useMemo(() => ++instanceCounter, []));

  // Get current preferences
  const { pluginsEnabled } = getPreferenceValues<SpotlightSearchPreferences>();

  // Use Raycast's useCachedPromise with proper caching
  const { data: plugins = [], isLoading } = useCachedPromise(
    async () => {
      // Only log if not already loaded
      if (!plugins.length) {
        log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Loading plugins`, { pluginsEnabled });
      }

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

  // Log mount/unmount for debugging, but only once per instance
  useEffect(() => {
    const instanceId = instanceIdRef.current;
    log("debug", "usePluginManagement", `Instance #${instanceId} mounted`);

    return () => {
      log("debug", "usePluginManagement", `Instance #${instanceId} unmounted`);
    };
  }, []); // Empty dependency array ensures this only runs once per instance

  return {
    plugins,
    hasCheckedPlugins: !isLoading,
    pluginsEnabled,
  };
}
