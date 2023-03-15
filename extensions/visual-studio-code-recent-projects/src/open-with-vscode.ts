import { showToast, Toast, open, closeMainWindow, getSelectedFinderItems } from "@raycast/api";
import { bundleIdentifier } from "./preferences";

export default async function main() {
  try {
    const finderItems = await getSelectedFinderItems();
    if (finderItems.length === 0) {
      throw new Error("No Finder item selected");
    }

    for (const finderItem of finderItems) {
      await open(finderItem.path, bundleIdentifier);
    }

    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening selected Finder item",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
