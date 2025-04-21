import { useState, useEffect, useRef } from "react";
import { showFailureToast } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { FolderSearchPlugin, SpotlightSearchPreferences } from "../types";
import { loadPlugins, log } from "../utils";

// Global flag to avoid duplicate loading of plugins
let pluginsLoaded = false;
let cachedPlugins: FolderSearchPlugin[] = [];

// Counter to track instances for debugging
let instanceCounter = 0;

// Function to clear the plugin cache - useful when preferences change
export function clearPluginCache() {
  pluginsLoaded = false;
  cachedPlugins = [];
  log("debug", "usePluginManagement", "Plugin cache cleared");
}

/**
 * Hook for managing plugins
 */
export function usePluginManagement() {
  // Create a unique ID for this hook instance
  const instanceIdRef = useRef<number>(++instanceCounter);
  const [plugins, setPlugins] = useState<FolderSearchPlugin[]>([]);
  const [hasCheckedPlugins, setHasCheckedPlugins] = useState<boolean>(false);
  
  // Get current preferences directly in the hook
  const { pluginsEnabled } = getPreferenceValues<SpotlightSearchPreferences>();

  useEffect(() => {
    // Log at mount time to help diagnose multiple instances
    log("debug", "usePluginManagement", `Instance #${instanceIdRef.current} mounted, plugins cache status: ${pluginsLoaded ? "populated" : "empty"}`);
    
    const loadPluginsAsync = async () => {
      try {
        // Check if plugins are enabled in preferences
        if (!pluginsEnabled) {
          log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Plugins are disabled in preferences`);
          setPlugins([]);
          setHasCheckedPlugins(true);
          // Clear any cached plugins to ensure they're reloaded if enabled later
          clearPluginCache();
          return;
        }
        
        // Avoid duplicate loading of plugins across multiple hook instances
        if (pluginsLoaded && cachedPlugins.length > 0) {
          log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Using cached plugins (${cachedPlugins.length} plugins)`);
          setPlugins(cachedPlugins);
          setHasCheckedPlugins(true);
          return;
        }

        log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Loading plugins for the first time`);

        // Use the loadPlugins function and pass the caller ID
        const loadedPlugins = await loadPlugins(`Instance_${instanceIdRef.current}`);
        
        // Cache plugins globally
        cachedPlugins = loadedPlugins;
        pluginsLoaded = true;
        
        // Update state
        setPlugins(loadedPlugins);
        setHasCheckedPlugins(true);
        
        log("debug", "usePluginManagement", `Instance #${instanceIdRef.current}: Finished loading ${loadedPlugins.length} plugins`);
      } catch (error) {
        log("error", "usePluginManagement", `Instance #${instanceIdRef.current}: Error loading plugins`, {
          error: error instanceof Error ? error.message : String(error),
        });
        showFailureToast({ title: "Could not read plugins" });
        setHasCheckedPlugins(true);
      }
    };

    loadPluginsAsync();
    
    // Cleanup function
    return () => {
      log("debug", "usePluginManagement", `Instance #${instanceIdRef.current} unmounted`);
    };
  }, [pluginsEnabled]); // Add pluginsEnabled to the dependencies array

  return {
    plugins,
    hasCheckedPlugins,
    pluginsEnabled
  };
} 