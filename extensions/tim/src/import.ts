import path from "path";
import { Alert, captureException, confirmAlert, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { hasData, importData, installedWrapper, openTaskManager } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    await showToast({
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
    await showHUD("File imported", { clearRootSearch: true });
    await openTaskManager();
  } catch (error) {
    captureException(error);
    await showFailureToast(error, { title: "Failed to import data" });
  }
});
