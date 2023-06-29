import { getSelectedFinderItems, showToast, Toast, open } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No directory selected",
        message: "Please select a directory in Finder first",
      });

      return;
    }

    const results = await Promise.all(selectedItems.map((item) => fs.stat(item.path).then((info) => ({ item, info }))));

    results
      .map((result) => (result.info.isDirectory() ? result.item.path : path.dirname(result.item.path)))
      .filter((value, index, self) => self.indexOf(value) === index)
      .forEach((toOpen) => {
        open("warp://action/new_tab?path=" + encodeURIComponent(toOpen));
      });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot open selected item",
      message: String(error),
    });
  }
}
