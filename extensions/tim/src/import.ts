import path from "path";
import { Alert, confirmAlert, getSelectedFinderItems, showToast, Toast } from "@raycast/api";

import { hasData, importData, installedWrapper, openTaskManager } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    showToast({
      title: "Importing data…",
      style: Toast.Style.Animated,
    });

    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length > 1) {
      return showToast({
        title: "Error",
        message: "You can only import one file",
        style: Toast.Style.Failure,
      });
    }

    const [file] = selectedItems;
    if (path.extname(file.path) !== ".json") {
      return showToast({
        title: "Error",
        message: "You can only import .json files",
        style: Toast.Style.Failure,
      });
    }

    if (
      (await hasData()) &&
      (await confirmAlert({
        title: "Warning",
        message: "If you import this file, current data will be lost!",
        primaryAction: {
          title: "Override",
          style: Alert.ActionStyle.Destructive,
        },
      })) === false
    ) {
      return;
    }

    await importData(file.path);
    showToast({
      title: "Success",
      message: "File imported",
      style: Toast.Style.Success,
    });
    openTaskManager();
  } catch (error) {
    showToast({
      title: "Error",
      message: "No file selected in Finder",
      style: Toast.Style.Failure,
    });
  }
});
