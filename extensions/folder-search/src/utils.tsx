import { Alert, Icon, closeMainWindow, confirmAlert, trash, showToast, popToRoot } from "@raycast/api";

import { runAppleScriptSync } from "run-applescript";

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
  runAppleScriptSync(`
    set result to (POSIX file "${result.path}") as alias
    tell application "Finder"
      open information window of result
      activate
    end tell
  `);

  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });
};

const copyFolderToClipboard = (result: SpotlightSearchResult) => {
  runAppleScriptSync(`set the clipboard to POSIX file "${result.path}"`);
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

export {
  safeSearchScope,
  folderName,
  enclosingFolderName,
  showFolderInfoInFinder,
  copyFolderToClipboard,
  maybeMoveResultToTrash,
};
