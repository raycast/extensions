import fs from "node:fs/promises";
import path from "node:path";
import { getSelectedFinderItems, showToast, Toast, open, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getNewTabUri } from "./uri";
import { getAppName } from "./constants";

const getSelectedPathFinderItems = async () => {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;

  const paths = await runAppleScript(script);
  return paths.split(",");
};

const fallback = async (): Promise<boolean> => {
  const app = await getFrontmostApplication();

  if (app.name !== "Finder") {
    return false;
  }

  const currentDirectory = await runAppleScript(
    `tell application "Finder" to get POSIX path of (target of front window as alias)`
  );

  if (!currentDirectory) {
    return false;
  }

  await open(getNewTabUri(currentDirectory));

  return true;
};

export default async function Command() {
  try {
    let selectedItems: { path: string }[] = [];

    const app = await getFrontmostApplication();

    if (app.name === "Finder") {
      selectedItems = await getSelectedFinderItems();
    } else if (app.name === "Path Finder") {
      const paths = await getSelectedPathFinderItems();
      selectedItems = paths.map((p) => ({ path: p }));
    }

    if (selectedItems.length === 0) {
      const ranFallback = await fallback();

      if (ranFallback === false) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No directory selected",
          message: `Please select a directory in Finder or Path Finder to open in ${getAppName()}`,
        });
      }

      return;
    }

    const results = await Promise.all(selectedItems.map((item) => fs.stat(item.path).then((info) => ({ item, info }))));

    results
      .map((result) => (result.info.isDirectory() ? result.item.path : path.dirname(result.item.path)))
      .filter((value, index, self) => self.indexOf(value) === index)
      .forEach((toOpen) => open(getNewTabUri(toOpen)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Cannot open selected item in ${getAppName()}`,
      message: String(error),
    });
  }
}
