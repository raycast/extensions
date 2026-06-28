import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { applyWallpaperUpdate, isValidFile } from "./utils";

export default async function main() {
  try {
    const files = await getSelectedFinderItems();

    if (files.length === 0) {
      showHUD("No picture selected");
      return;
    }

    if (files.length !== 1) {
      showHUD("Only one picture should be selected");
      return;
    }

    const file = files[0];

    if (!isValidFile(file)) {
      showHUD(`Only pictures with these extensions are supported: .jpg, .jpeg, .png, .gif, .heic`);
      return;
    }

    await applyWallpaperUpdate(file.path);
    showHUD("Wallpaper updated");
  } catch {
    showHUD("No picture selected");
  }
}
