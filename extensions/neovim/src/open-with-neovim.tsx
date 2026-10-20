import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { openInNvim } from "./lib/nvim";

export default async function OpenWithNeovim() {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showToast(Toast.Style.Failure, "No items selected", "Select files or folders in Finder first");
      return;
    }

    await closeMainWindow();
    const paths = items.map((item) => item.path);
    await openInNvim(paths);
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to open in Neovim",
      error instanceof Error ? error.message : String(error),
    );
  }
}
