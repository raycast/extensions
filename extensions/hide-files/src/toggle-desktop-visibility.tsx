import { homedir } from "os";
import { closeMainWindow } from "@raycast/api";
import { hideFilesInFolder, isWidgetVisible, toggleWidgetsVisibility, Visibility } from "./utils/hide-files-utils";

export default async () => {
  await closeMainWindow();
  const isFileHidden = await hideFilesInFolder(homedir() + "/Desktop/");

  if (typeof isFileHidden === "boolean") {
    toggleWidgetsVisibility(isFileHidden ? Visibility.VISIBLE : Visibility.INVISIBLE);
  } else {
    const isWidgetVisible_ = isWidgetVisible();
    if (typeof isWidgetVisible_ === "boolean") {
      toggleWidgetsVisibility(isWidgetVisible_ ? Visibility.INVISIBLE : Visibility.VISIBLE);
    }
  }
};
