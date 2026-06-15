import { getSelectedFinderItems, showHUD, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import GitfoxPreferences from "./interfaces/gitfox-preferences";
import { isGitfoxCliInstalled } from "./utils";

const execp = promisify(exec);

export default async function OpenInGitfox() {
  if (!isGitfoxCliInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Gitfox CLI Not Found",
      message: "Please configure the Gitfox CLI path in extension preferences.",
    });
    return;
  }

  let selectedItems;
  try {
    selectedItems = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Selection",
      message: "Please select a folder in Finder first.",
    });
    return;
  }

  if (selectedItems.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Selection",
      message: "Please select a folder in Finder first.",
    });
    return;
  }

  const folders = selectedItems.filter((item) => {
    try {
      return fs.statSync(item.path).isDirectory();
    } catch {
      return false;
    }
  });

  if (folders.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Folders Selected",
      message: "Please select a folder (not a file) in Finder.",
    });
    return;
  }

  try {
    const prefs = getPreferenceValues<GitfoxPreferences>();
    for (const folder of folders) {
      await execp(`${prefs.gitfoxCliPath} "${folder.path}"`);
    }
    await closeMainWindow();
    await showHUD(
      folders.length === 1
        ? `Opened ${folders[0].path.split("/").pop()} in Gitfox`
        : `Opened ${folders.length} folders in Gitfox`,
    );
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open",
      message: e instanceof Error ? e.message : "An unknown error occurred.",
    });
  }
}
