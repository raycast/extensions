import { Alert, Icon, closeMainWindow, confirmAlert, getPreferenceValues, popToRoot, trash } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import fs from "fs";
import * as yup from "yup";
import path from "path";
import os from "os";

import { SpotlightSearchPreferences, SpotlightSearchResult } from "./types";
import { showFailureToast } from "@raycast/utils";

// Logging configuration
const LOG_ENABLED = true; // Set to true to enable all logging
const LOG_LEVEL: "debug" | "error" = "debug"; // Set to "debug" for verbose logging or "error" for less noise

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
    appleScript: yup.object().required(),
  })
  .required()
  .strict()
  .noUnknown(true);

const loadPlugins = async () => {
  // grab prefs
  const { pluginsEnabled, pluginsFolder } = getPreferenceValues<SpotlightSearchPreferences>();

  log("debug", "loadPlugins", "Loading plugins", {
    pluginsEnabled,
    pluginsFolder,
  });

  if (!pluginsEnabled) {
    log("debug", "loadPlugins", "Plugins are disabled in preferences");
    return [];
  }

  if (!pluginsFolder || pluginsFolder.trim() === "") {
    log("debug", "loadPlugins", "No plugins folder specified");
    return [];
  }

  // Normalize the path (remove trailing slash and expand ~)
  const normalizedPath = pluginsFolder.replace(/\/$/, "").replace(/^~/, os.homedir());

  try {
    // Check if path exists and is a directory
    const stats = await fs.promises.stat(normalizedPath);
    if (!stats.isDirectory()) {
      log("error", "loadPlugins", "Plugins path is not a directory", { path: normalizedPath });
      return [];
    }
  } catch (error) {
    log("error", "loadPlugins", "Failed to access plugins directory", {
      path: normalizedPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  const validPlugins = [];
  const invalidPluginFiles = [];

  try {
    const files = await fs.promises.readdir(normalizedPath);
    log("debug", "loadPlugins", "Found plugin files", { files });

    // we only want .js/plugin files (not .DS_Store etc)
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    log("debug", "loadPlugins", "Filtered JS files", { jsFiles });

    for (const file of jsFiles) {
      try {
        // load and validate
        const pluginPath = path.join(normalizedPath, file);
        log("debug", "loadPlugins", "Loading plugin", { file, pluginPath });

        const { FolderSearchPlugin } = await import(pluginPath);
        log("debug", "loadPlugins", "Plugin loaded", {
          file,
          title: FolderSearchPlugin.title,
          shortcut: FolderSearchPlugin.shortcut,
        });

        await pluginSchema.validate(FolderSearchPlugin);
        validPlugins.push(FolderSearchPlugin);
      } catch (e) {
        log("error", "loadPlugins", "Failed to load plugin", {
          file,
          error: e instanceof Error ? e.message : String(e),
        });
        invalidPluginFiles.push(file);
      }
    }
  } catch (error) {
    log("error", "loadPlugins", "Failed to read plugins directory", {
      path: normalizedPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  if (invalidPluginFiles.length) {
    log("error", "loadPlugins", "Some plugins failed to load", { invalidPluginFiles });
  }

  return validPlugins;
};

const safeSearchScope = (searchScope: string | undefined) => {
  return searchScope === "" ? undefined : searchScope;
};

const folderName = (result: SpotlightSearchResult) => {
  return result.path.slice(0).split("/").pop() || "Untitled";
};

const enclosingFolderName = (result: SpotlightSearchResult) => {
  return [...result.path.split("/")]
    .filter((_, pathPartIndex) => pathPartIndex < [...result.path.split("/")].length - 1)
    .join("/");
};

const showFolderInfoInFinder = (result: SpotlightSearchResult) => {
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

const copyFolderToClipboard = (result: SpotlightSearchResult) => {
  runAppleScript(`set the clipboard to POSIX file "${result.path}"`);
};

const maybeMoveResultToTrash = async (result: SpotlightSearchResult, resultWasTrashed: () => void) => {
  const options: Alert.Options = {
    title: "Move to Trash",
    message: `Are you sure you want to move "${folderName(result)}" to the Trash?`,
    icon: Icon.Trash,
    primaryAction: {
      title: `Move to Trash`,
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        trash(result.path);
        showFailureToast({ title: "Moved to Trash", message: folderName(result) });
        resultWasTrashed();
      },
    },
  };

  await confirmAlert(options);
};

const lastUsedSort = (a: SpotlightSearchResult, b: SpotlightSearchResult) => {
  const [safeA, safeB] = [a.kMDItemLastUsedDate || 0, b.kMDItemLastUsedDate || 0];

  return new Date(safeB).getTime() - new Date(safeA).getTime();
};

const fixDoubleConcat = (text: string): string => {
  const regex = /^(.+)\1$/; // Matches a string followed by the same string again

  if (regex.test(text)) {
    const originalText = text.replace(regex, "$1");
    return originalText;
  }

  return text;
};

const CLOUD_STORAGE_PATHS = [
  // iCloud Drive
  `${userHomeDir}/Library/Mobile Documents/com~apple~CloudDocs`,
  // Dropbox
  `${userHomeDir}/Library/CloudStorage/Dropbox`,
  // Google Drive
  `${userHomeDir}/Library/CloudStorage/GoogleDrive`,
  // OneDrive
  `${userHomeDir}/Library/CloudStorage/OneDrive-Personal`,
  `${userHomeDir}/Library/CloudStorage/OneDrive-Microsoft`,
];

export function isCloudStoragePath(path: string): boolean {
  return CLOUD_STORAGE_PATHS.some((cloudPath) => path.startsWith(cloudPath));
}

export function isLibraryPath(path: string): boolean {
  return path.includes(`${process.env.HOME}/Library`);
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
  } catch (e) {
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

export {
  loadPlugins,
  safeSearchScope,
  folderName,
  enclosingFolderName,
  showFolderInfoInFinder,
  copyFolderToClipboard,
  maybeMoveResultToTrash,
  lastUsedSort,
  fixDoubleConcat,
};
