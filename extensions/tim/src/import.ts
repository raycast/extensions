import path from "path";

import { Alert, confirmAlert, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { getExportData } from "./export";
import openTaskManager from "./openTaskManager";
import { buildScriptEnsuringTimIsRunning, checkIfTimInstalled, showNotInstalledToast } from "./utils";

async function existsData(): Promise<boolean> {
  const jsonString = await getExportData();
  const data = JSON.parse(jsonString);
  return Object.keys(data.tasks ?? {}).length > 0;
}

export default async () => {
  const timAvailable = await checkIfTimInstalled();
  if (!timAvailable) return showNotInstalledToast();

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
      (await existsData()) &&
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

    const script = buildScriptEnsuringTimIsRunning(`import (POSIX file "${file.path}")`);
    await runAppleScript(script);
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
};
