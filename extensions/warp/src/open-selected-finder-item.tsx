import fs from "node:fs/promises";
import path from "node:path";
import { getSelectedFinderItems, showToast, Toast, open } from "@raycast/api";
import { getNewTabUri } from "./uri";
import { getAppName } from "./constants";

export default async function Command() {
  try {
    const selectedItems: { path: string }[] = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No directory selected",
        message: `Please select a directory to open in ${getAppName()}`,
      });
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
