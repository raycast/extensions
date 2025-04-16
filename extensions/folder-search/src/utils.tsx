import fs from "fs";
import path from "path";
import { homedir } from "node:os";

import {
  Alert,
  Icon,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  trash,
  showToast,
  popToRoot,
} from "@raycast/api";

import { runAppleScript } from "run-applescript";
import * as yup from "yup";

import { SpotlightSearchPreferences, SpotlightSearchResult } from "./types";

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

  if (!(pluginsEnabled && pluginsFolder && pluginsFolder !== "")) {
    return [];
  }

  const validPlugins = [];
  const invalidPluginFiles = [];

  const files = await fs.promises.readdir(pluginsFolder);

  // we only want .js/plugin files (not .DS_Store etc)
  const jsFiles = files.filter((file) => file.endsWith(".js"));

  for (const file of jsFiles) {
    try {
      // load and validate
      const { FolderSearchPlugin } = await import(path.join(pluginsFolder, file));

      await pluginSchema.validate(FolderSearchPlugin);

      validPlugins.push(FolderSearchPlugin);
    } catch (e) {
      invalidPluginFiles.push(file);
    }
  }

  console.debug("Invalid plugin files: ", invalidPluginFiles);

  if (invalidPluginFiles.length) {
    throw new Error("Invalid plugins found");
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
        showToast({ title: "Moved to Trash", message: folderName(result) });
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
  `${homedir()}/Library/Mobile Documents/com~apple~CloudDocs`,
  // Dropbox
  `${homedir()}/Library/CloudStorage/Dropbox`,
  // Google Drive
  `${homedir()}/Library/CloudStorage/GoogleDrive`,
  // OneDrive
  `${homedir()}/Library/CloudStorage/OneDrive-Personal`,
  `${homedir()}/Library/CloudStorage/OneDrive-Microsoft`,
];

export function isCloudStoragePath(path: string): boolean {
  return CLOUD_STORAGE_PATHS.some((cloudPath) => path.startsWith(cloudPath));
}

export function isLibraryPath(path: string): boolean {
  return path.includes(`${homedir()}/Library`);
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
