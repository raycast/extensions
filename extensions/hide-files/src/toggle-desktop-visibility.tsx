import { homedir } from "os";
import { closeMainWindow } from "@raycast/api";
import { hideFilesInFolder, isWidgetVisible, toggleWidgetsVisibility, Visibility } from "./utils/hide-files-utils";
import { hideWidgets } from "./types/preferences";

export default async () => {
  await closeMainWindow();
  const isFileHidden = await hideFilesInFolder(homedir() + "/Desktop/");

  if (hideWidgets) {
    // Preferences Hide Widgets is enabled
    if (typeof isFileHidden === "boolean") {
      // There are files on the Desktop, the visibility of the widgets is determined by the visibility of the files
      toggleWidgetsVisibility(isFileHidden ? Visibility.VISIBLE : Visibility.INVISIBLE);
    } else {
      // There are no files on the Desktop, the visibility of the widgets is determined by the current visibility
      const isWidgetVisible_ = isWidgetVisible();
      if (typeof isWidgetVisible_ === "boolean") {
        toggleWidgetsVisibility(isWidgetVisible_ ? Visibility.INVISIBLE : Visibility.VISIBLE);
      }
    }
  } else {
    // Preferences Hide Widgets is disabled
    // The visibility of the widgets is visible
    toggleWidgetsVisibility(Visibility.VISIBLE);
  }
};
