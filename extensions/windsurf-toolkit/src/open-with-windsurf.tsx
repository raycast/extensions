import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { openProjectInWindsurf } from "./windsurf";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      showToast(Toast.Style.Failure, "No items selected in Finder");
      return;
    }

    // Open each selected item in Windsurf
    for (const item of selectedItems) {
      // Remove file:// prefix if present
      const path = item.path.startsWith("file://")
        ? decodeURIComponent(item.path.slice(7))
        : item.path;
      await openProjectInWindsurf(path);
    }

    showToast(
      Toast.Style.Success,
      `Opened ${selectedItems.length} item(s) in Windsurf`
    );
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Failed to open with Windsurf",
      String(error)
    );
  }
}
