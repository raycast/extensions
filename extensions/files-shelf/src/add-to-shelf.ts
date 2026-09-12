import { showHUD, getSelectedFinderItems } from "@raycast/api";
import { addToShelf } from "./lib/shelf-storage";

export default async function main() {
  try {
    const finderItems = await getSelectedFinderItems();

    if (finderItems.length === 0) {
      await showHUD("No files or folders selected in Finder");
      return;
    }

    const paths = finderItems.map((item) => item.path);
    const { added, duplicates } = await addToShelf(paths);

    if (added === 0 && duplicates > 0) {
      await showHUD(`All ${duplicates} item${duplicates > 1 ? "s" : ""} already on shelf`);
    } else if (duplicates > 0) {
      await showHUD(
        `Added ${added} item${added > 1 ? "s" : ""} to shelf (${duplicates} duplicate${duplicates > 1 ? "s" : ""} skipped)`,
      );
    } else {
      await showHUD(`Added ${added} item${added > 1 ? "s" : ""} to shelf`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Finder")) {
      await showHUD("Please select files or folders in Finder first");
    } else {
      await showHUD("Failed to add items to shelf");
    }
  }
}
