import { showHUD, getSelectedFinderItems, open, closeMainWindow } from "@raycast/api";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showHUD("No items selected in Finder");
      return;
    }

    await closeMainWindow();

    const firstItem = selectedItems[0];
    await open(firstItem.path, "com.qoder.ide");

    const fileName = firstItem.path.split("/").pop() || "file";
    await showHUD(`Opening in Qoder: ${fileName}`);
  } catch {
    await showHUD("Failed to open in Qoder. Please select a file or folder in Finder.");
  }
}
