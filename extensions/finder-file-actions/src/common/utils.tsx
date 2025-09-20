import { Alert, Icon, closeMainWindow, confirmAlert, trash, showToast, popToRoot } from "@raycast/api";

import { runAppleScript } from "run-applescript";
import { SpotlightSearchResult } from "./types";
import path from "path";

const safeSearchScope = (searchScope: string | undefined) => {
  return searchScope === "" ? undefined : searchScope;
};

// Map to cache system folder names
const systemFolderNameCache = new Map<string, string>();

// Function to get localized display name for a path
const getLocalizedFolderName = async (folderPath: string): Promise<string> => {
  // Check cache first
  if (systemFolderNameCache.has(folderPath)) {
    return systemFolderNameCache.get(folderPath)!;
  }

  // Default to the last part of the path
  let name = path.basename(folderPath);

  try {
    // Only run AppleScript for common system folders to avoid performance issues
    const homePath = process.env.HOME || "";
    const commonPaths = [
      path.join(homePath, "Desktop"),
      path.join(homePath, "Documents"),
      path.join(homePath, "Downloads"),
      path.join(homePath, "Pictures"),
      path.join(homePath, "Music"),
      path.join(homePath, "Movies"),
    ];

    // Only use AppleScript for system folders
    if (commonPaths.includes(folderPath)) {
      const script = `
        tell application "System Events"
          set folderPath to "${folderPath}"
          set folderAlias to POSIX file folderPath as alias
          return name of folderAlias
        end tell
      `;

      const result = await runAppleScript(script);
      if (result && result.trim()) {
        name = result.trim();
        // Cache the result
        systemFolderNameCache.set(folderPath, name);
      }
    }
  } catch (error) {
    console.error(`Error getting localized name for ${folderPath}:`, error);
  }

  return name;
};

const folderName = (result: SpotlightSearchResult) => {
  // Use kMDItemDisplayName if available (this is set by Spotlight with the localized name)
  if (result.kMDItemDisplayName) {
    return result.kMDItemDisplayName;
  }

  // Otherwise fall back to the path's basename
  return path.basename(result.path) || "Untitled";
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

export {
  safeSearchScope,
  folderName,
  enclosingFolderName,
  showFolderInfoInFinder,
  copyFolderToClipboard,
  maybeMoveResultToTrash,
  lastUsedSort,
  fixDoubleConcat,
  getLocalizedFolderName,
};
