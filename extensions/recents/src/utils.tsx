import { Alert, Icon, closeMainWindow, confirmAlert, popToRoot, showToast, trash } from "@raycast/api";

import { runAppleScript } from "run-applescript";

import { SpotlightResult } from "./types";

export const showInfoInFinder = (recent: SpotlightResult) => {
  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });

  runAppleScript(`
    set result to (POSIX file "${recent.kMDItemPath}") as alias
    tell application "Finder"
      open information window of result
      activate
    end tell
  `);
};

export const copyRecentToClipboard = (recent: SpotlightResult) => {
  runAppleScript(`set the clipboard to POSIX file "${recent.kMDItemPath}"`);
};

export const maybeMoveResultToTrash = async (recent: SpotlightResult) => {
  const options: Alert.Options = {
    title: "Move to Trash",
    message: `Are you sure you want to move "${recent.kMDItemDisplayName}" to the Trash?`,
    icon: Icon.Trash,
    primaryAction: {
      title: `Move to Trash`,
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        trash(recent.kMDItemPath);
        showToast({ title: "Moved to Trash", message: recent.kMDItemDisplayName });
      },
    },
  };

  await confirmAlert(options);
};
