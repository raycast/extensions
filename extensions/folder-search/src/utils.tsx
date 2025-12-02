import {
  Alert,
  Icon,
  Cache,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  popToRoot,
  trash,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import fs from "fs";
import * as yup from "yup";
import path from "path";
import os from "os";
import { SpotlightSearchPreferences, SpotlightSearchResult } from "./types";
import { LOG_ENABLED, LOG_LEVEL, LOG_CACHE_OPERATIONS } from "./hooks/useFolderSearch";

// Create a plugins cache instance with namespace
const pluginsCache = new Cache({
  namespace: "folder-search-plugins",
  capacity: 5 * 1024 * 1024, // 5MB should be plenty for plugins
});

// Cache key for plugins
const PLUGINS_CACHE_KEY = "plugin_paths";

// Cache timestamp key to check for freshness
const PLUGINS_CACHE_TIMESTAMP_KEY = "plugins_timestamp";

// Cache validity period (12 hours in milliseconds)
const CACHE_VALIDITY_PERIOD = 12 * 60 * 60 * 1000;

// Track plugin load calls for debugging
let pluginLoadCounter = 0;

// Function to check plugins cache
const getPluginPathsFromCache = () => {
  try {
    // Check if we have a timestamp
    const timestampStr = pluginsCache.get(PLUGINS_CACHE_TIMESTAMP_KEY);

    if (!timestampStr) {
      if (LOG_CACHE_OPERATIONS) {
        log("debug", "getPluginPathsFromCache", "No timestamp in cache");
      }
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_VALIDITY_PERIOD) {
      if (LOG_CACHE_OPERATIONS) {
        log("debug", "getPluginPathsFromCache", "Cache expired", {
          timestamp,
          now,
          age: now - timestamp,
          validityPeriod: CACHE_VALIDITY_PERIOD,
        });
      }
      return null;
    }

    // Check if plugins directory has been modified since cache was created
    try {
      const { pluginsFolder } = getPreferenceValues<SpotlightSearchPreferences>();
      if (pluginsFolder) {
        const normalizedPath = pluginsFolder.replace(/\/$/, "").replace(/^~/, os.homedir());
        const dirStats = fs.statSync(normalizedPath);
        const dirModTime = dirStats.mtime.getTime();

        if (dirModTime > timestamp) {
          if (LOG_CACHE_OPERATIONS) {
            log("debug", "getPluginPathsFromCache", "Plugins directory modified since cache, invalidating", {
              cacheTime: new Date(timestamp).toISOString(),
              dirModTime: new Date(dirModTime).toISOString(),
            });
          }
          return null;
        }
      }
    } catch (error) {
      // If we can't check the directory, just use the cache
      if (LOG_CACHE_OPERATIONS) {
        log("debug", "getPluginPathsFromCache", "Could not check plugins directory modification time", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Get plugin paths from cache
    const pathsJson = pluginsCache.get(PLUGINS_CACHE_KEY);
    if (!pathsJson) {
      if (LOG_CACHE_OPERATIONS) {
        log("debug", "getPluginPathsFromCache", "No plugin paths in cache");
      }
      return null;
    }

    // Parse and return plugin paths
    const pluginPaths = JSON.parse(pathsJson);
    if (LOG_CACHE_OPERATIONS) {
      log("debug", "getPluginPathsFromCache", "Retrieved plugin paths from cache", {
        count: pluginPaths.length,
      });
    }
    return pluginPaths;
  } catch (error) {
    log("error", "getPluginPathsFromCache", "Error retrieving from cache", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// Function to save plugin paths to cache
const savePluginPathsToCache = (pluginPaths: string[]) => {
  try {
    // Save plugin paths
    pluginsCache.set(PLUGINS_CACHE_KEY, JSON.stringify(pluginPaths));

    // Save timestamp
    pluginsCache.set(PLUGINS_CACHE_TIMESTAMP_KEY, Date.now().toString());

    if (LOG_CACHE_OPERATIONS) {
      log("debug", "savePluginPathsToCache", "Saved plugin paths to cache", {
        count: pluginPaths.length,
      });
    }
  } catch (error) {
    log("error", "savePluginPathsToCache", "Error saving to cache", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const userHomeDir = os.homedir();

// validation schemas for Plugins
const PluginShortcutSchema = yup
  .object({
    modifiers: yup.array().required(),
    key: yup.string().required(),
  })
  .required()
  .strict()
  .noUnknown(true);

const pluginSchema = yup
  .object({
    title: yup.string().required(),
    icon: yup.string().required(),
    shortcut: PluginShortcutSchema.required(),
    appleScript: yup
      .mixed()
      .required()
      .test("is-function", "appleScript must be a function", (value) => typeof value === "function"),
  })
  .required()
  .strict()
  .noUnknown(true);

export const loadPlugins = async (callerId?: string) => {
  const loadId = ++pluginLoadCounter;
  const logPrefix = callerId ? `[${callerId} #${loadId}]` : `[load #${loadId}]`;

  log("debug", "loadPlugins", `${logPrefix} Starting plugin load`);

  // First, try to get plugin paths from cache
  const cachedPluginPaths = getPluginPathsFromCache();
  if (cachedPluginPaths) {
    log("debug", "loadPlugins", `${logPrefix} Loading ${cachedPluginPaths.length} plugins from cached paths`);

    // Load plugins from cached paths
    const plugins = [];
    for (const pluginPath of cachedPluginPaths) {
      try {
        const { FolderSearchPlugin } = await import(pluginPath);
        await pluginSchema.validate(FolderSearchPlugin);
        plugins.push(FolderSearchPlugin);
      } catch (error) {
        log("error", "loadPlugins", `${logPrefix} Failed to load cached plugin: ${pluginPath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    log("debug", "loadPlugins", `${logPrefix} Successfully loaded ${plugins.length} plugins from cache`);
    return plugins;
  }

  // If not in cache, load plugins as normal
  // grab prefs
  const { pluginsEnabled, pluginsFolder } = getPreferenceValues<SpotlightSearchPreferences>();

  log("debug", "loadPlugins", `${logPrefix} Loading plugins from disk`, {
    pluginsEnabled,
    pluginsFolder,
  });

  if (!pluginsEnabled) {
    log("debug", "loadPlugins", `${logPrefix} Plugins are disabled in preferences`);
    return [];
  }

  if (!pluginsFolder || pluginsFolder.trim() === "") {
    log("debug", "loadPlugins", `${logPrefix} No plugins folder specified`);
    return [];
  }

  // Normalize the path (remove trailing slash and expand ~)
  const normalizedPath = pluginsFolder.replace(/\/$/, "").replace(/^~/, os.homedir());

  try {
    // Check if path exists and is a directory
    const stats = await fs.promises.stat(normalizedPath);
    if (!stats.isDirectory()) {
      log("error", "loadPlugins", `${logPrefix} Plugins path is not a directory`, { path: normalizedPath });
      return [];
    }
  } catch (error) {
    log("error", "loadPlugins", `${logPrefix} Failed to access plugins directory`, {
      path: normalizedPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  const validPluginPaths = [];
  const validPlugins = [];
  const invalidPluginFiles = [];

  try {
    const files = await fs.promises.readdir(normalizedPath);

    // we only want .js/plugin files (not .DS_Store etc)
    const jsFiles = files.filter((file) => file.endsWith(".js"));

    log("debug", "loadPlugins", `${logPrefix} Found ${jsFiles.length} plugins to load`);

    for (const file of jsFiles) {
      try {
        // load and validate
        const pluginPath = path.join(normalizedPath, file);

        const { FolderSearchPlugin } = await import(pluginPath);

        await pluginSchema.validate(FolderSearchPlugin);
        validPluginPaths.push(pluginPath);
        validPlugins.push(FolderSearchPlugin);
      } catch (e) {
        log("error", "loadPlugins", `${logPrefix} Failed to load plugin`, {
          file,
          error: e instanceof Error ? e.message : String(e),
        });
        invalidPluginFiles.push(file);
      }
    }
  } catch (error) {
    log("error", "loadPlugins", `${logPrefix} Failed to read plugins directory`, {
      path: normalizedPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  if (invalidPluginFiles.length) {
    log("error", "loadPlugins", `${logPrefix} Some plugins failed to load`, { invalidPluginFiles });
  }

  log("debug", "loadPlugins", `${logPrefix} Successfully loaded ${validPlugins.length} plugins`);

  // Cache the loaded plugin paths
  savePluginPathsToCache(validPluginPaths);

  return validPlugins;
};

/**
 * Check if a folder matches a search query by filtering special characters and comparing case-insensitively
 */
export const matchesSearchQuery = (folderName: string, searchQuery: string): boolean => {
  if (!searchQuery) return true;

  const cleanQuery = searchQuery.replace(/[[|\]]/gi, "").toLocaleLowerCase();
  const cleanFolderName = folderName.toLocaleLowerCase();

  return cleanFolderName.includes(cleanQuery);
};

export const safeSearchScope = (searchScope: string | undefined) => {
  return searchScope === "" ? undefined : searchScope;
};

export const folderName = (result: SpotlightSearchResult) => {
  return result.path.slice(0).split("/").pop() || "Untitled";
};

export const enclosingFolderName = (result: SpotlightSearchResult) => {
  return [...result.path.split("/")]
    .filter((_, pathPartIndex) => pathPartIndex < [...result.path.split("/")].length - 1)
    .join("/");
};

export const showFolderInfoInFinder = (result: SpotlightSearchResult) => {
  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });

  runAppleScript(`
    set result to (POSIX file "${result.path}") as alias
    tell application "Finder"
      open information window of result
      activate
    end tell
  `);
};

export const copyFolderToClipboard = (result: SpotlightSearchResult) => {
  runAppleScript(`set the clipboard to POSIX file "${result.path}"`);
};

export const maybeMoveResultToTrash = async (result: SpotlightSearchResult, resultWasTrashed: () => void) => {
  const options: Alert.Options = {
    title: "Move to Trash",
    message: `Are you sure you want to move "${folderName(result)}" to the Trash?`,
    icon: Icon.Trash,
    primaryAction: {
      title: `Move to Trash`,
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        trash(result.path);
        showToast({ title: "Moved to Trash", message: folderName(result), style: Toast.Style.Success });
        resultWasTrashed();
      },
    },
  };

  await confirmAlert(options);
};

export const lastUsedSort = (a: SpotlightSearchResult, b: SpotlightSearchResult) => {
  const [safeA, safeB] = [a.kMDItemLastUsedDate || 0, b.kMDItemLastUsedDate || 0];

  return new Date(safeB).getTime() - new Date(safeA).getTime();
};

const CLOUD_STORAGE_PATHS = [
  // iCloud Drive
  `${userHomeDir}/Library/Mobile Documents/com~apple~CloudDocs`,
  // Dropbox
  `${userHomeDir}/Library/CloudStorage/Dropbox`,
  // Google Drive
  `${userHomeDir}/Library/CloudStorage/GoogleDrive`,
  // OneDrive (dynamic tenant name)
  `${userHomeDir}/Library/CloudStorage/OneDrive`,
  // Synology Drive (dynamic server name)
  `${userHomeDir}/Library/CloudStorage/SynologyDrive`,
];

export function isCloudStoragePath(path: string): boolean {
  return CLOUD_STORAGE_PATHS.some((cloudPath) => path.startsWith(cloudPath));
}

export function isLibraryPath(path: string): boolean {
  return path.includes(`${userHomeDir}/Library`);
}

export function shouldShowPath(path: string, showNonCloudLibraryPaths: boolean): boolean {
  // Always show non-Library paths
  if (!isLibraryPath(path)) {
    return true;
  }

  // Always show cloud storage paths
  if (isCloudStoragePath(path)) {
    return true;
  }

  // Show other Library paths based on preference
  return showNonCloudLibraryPaths;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "-";
  }
}

// Logging utility
export const log = (level: "debug" | "error", component: string, message: string, data?: Record<string, unknown>) => {
  if (!LOG_ENABLED) return;
  // Skip debug messages when log level is set to error only
  if (level === "debug" && LOG_LEVEL !== "debug") return;

  const timestamp = new Date().toISOString();
  const logData = {
    ...data,
    component,
    timestamp,
  };

  if (level === "debug") {
    console.debug(`[FolderSearch] ${message}:`, logData);
  } else {
    console.error(`[FolderSearch] ${message}:`, logData);
  }
};

/**
 * Enhanced logging function that provides a detailed summary of key components
 * Use this for debugging complex issues with plugins, pins, and state synchronization
 */
export function logDiagnostics(component: string, message: string) {
  if (!LOG_ENABLED) return;

  // Create a visual divider in logs
  log("debug", component, "=".repeat(50));
  log("debug", component, `DIAGNOSTICS: ${message}`);
  log("debug", component, "-".repeat(50));

  // Attempt to get key state information
  try {
    // Get current preferences
    const prefs = getPreferenceValues<SpotlightSearchPreferences>();

    // Log preference information
    log("debug", component, "Preferences:", {
      pluginsEnabled: prefs.pluginsEnabled,
      pluginsFolder: prefs.pluginsFolder,
      isShowingDetail: prefs.isShowingDetail,
      searchScope: prefs.searchScope,
      pinCount: prefs.pinned?.length || 0,
    });

    // Log plugin state if we have access to it
    // We can't directly access the module variables so we'll use what we know
    log("debug", component, "Plugin system status:", {
      pluginLoadCounter: pluginLoadCounter,
      cacheIsEnabled: LOG_CACHE_OPERATIONS,
    });

    // Add memory usage information
    const memoryUsage = process.memoryUsage();
    log("debug", component, "Memory usage:", {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    });
  } catch (error) {
    log("error", component, "Error generating diagnostics", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  log("debug", component, "=".repeat(50));
}

export function fixDoubleConcat(text: string): string {
  if (!text || text.length < 2) return text;

  const halfLength = Math.floor(text.length / 2);
  const firstHalf = text.substring(0, halfLength);
  const secondHalf = text.substring(halfLength);

  // If the string is duplicated, use only the first half
  if (text.length % 2 === 0 && firstHalf === secondHalf) {
    return firstHalf;
  }

  return text;
}

// Function to manually clear the plugin cache (useful when new plugins are added)
export const clearPluginCache = () => {
  try {
    pluginsCache.remove(PLUGINS_CACHE_KEY);
    pluginsCache.remove(PLUGINS_CACHE_TIMESTAMP_KEY);
    log("debug", "clearPluginCache", "Plugin cache cleared manually");
  } catch (error) {
    log("error", "clearPluginCache", "Error clearing plugin cache", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
