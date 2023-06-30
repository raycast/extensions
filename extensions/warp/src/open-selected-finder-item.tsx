import { getSelectedFinderItems, showToast, Toast, open, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "node:fs/promises";
import path from "node:path";
import { newTab } from "./uri";

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

  await open(newTab(currentDirectory));

  return true;
};

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      const ranFallback = await fallback();

      if (ranFallback === false) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No directory selected",
          message: "Please select a directory in Finder first",
        });
      }

      return;
    }

    const results = await Promise.all(selectedItems.map((item) => fs.stat(item.path).then((info) => ({ item, info }))));

    results
      .map((result) => (result.info.isDirectory() ? result.item.path : path.dirname(result.item.path)))
      .filter((value, index, self) => self.indexOf(value) === index)
      .forEach((toOpen) => open(newTab(toOpen)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot open selected item",
      message: String(error),
    });
  }
}
