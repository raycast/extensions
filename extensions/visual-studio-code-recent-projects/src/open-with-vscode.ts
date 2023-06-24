import { showToast, Toast, open, closeMainWindow, getSelectedFinderItems } from "@raycast/api";
import { bundleIdentifier } from "./preferences";
import { getCurrentFinderPath } from "./utils/apple-scripts";

export default async function main() {
  try {
    const finderItems = await getSelectedFinderItems();
    if (finderItems.length === 0) {
      const currentPath = await getCurrentFinderPath();
      if (currentPath.length === 0) throw new Error("Not a valid directory");
      await open(currentPath, bundleIdentifier);
    } else {
      for (const finderItem of finderItems) {
        await open(finderItem.path, bundleIdentifier);
      }
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
