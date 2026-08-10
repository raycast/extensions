import { Clipboard, confirmAlert, getSelectedFinderItems, open } from "@raycast/api";
import { YoinkInstallLink, YoinkAppName, YoinkPath, YoinkPathSetApp } from "./constants";
import * as fs from "fs";

export function checkYoink() {
  // check if Yoink is installed
  try {
    return fs.existsSync(YoinkPath) || fs.existsSync(YoinkPathSetApp);
  } catch (e) {
    console.error(e);
  }
  return true;
}

export async function confirmAlertYoinkInstall() {
  try {
    await confirmAlert({
      icon: "yoink-icon.png",
      title: "Yoink is not installed",
      message: "To use this command, you need to install Yoink. Do you want to open the Yoink website?",
      primaryAction: {
        title: "Go Yoink Website",
        onAction: async () => {
          await open(YoinkInstallLink);
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
}

export async function addFromFinder() {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length > 0) {
      // add from finder
      for (const item of selectedItems) {
        await open(item.path, YoinkAppName);
      }
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

export async function addFromClipboard() {
  try {
    // add from clipboard
    const { file } = await Clipboard.read();
    if (file) {
      await open(file, YoinkAppName);
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}
