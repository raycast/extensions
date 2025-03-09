import { Alert, Icon, closeMainWindow, confirmAlert, showToast, popToRoot, trash } from "@raycast/api";

import { runAppleScript } from "run-applescript";

import { SpotlightSearchResult } from "./types";

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

export {
  safeSearchScope,
  folderName,
  enclosingFolderName,
  showFolderInfoInFinder,
  copyFolderToClipboard,
  maybeMoveResultToTrash,
  lastUsedSort,
  fixDoubleConcat,
};
