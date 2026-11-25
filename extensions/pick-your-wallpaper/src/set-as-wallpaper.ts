import { FileSystemItem, getSelectedFinderItems, showHUD } from "@raycast/api";
import { SUPPORTED_EXTENSIONS, applyWallpaperUpdate, isValidFile, showWallpaperError } from "./utils";

export default async function main() {
  let files: FileSystemItem[];
  try {
    files = await getSelectedFinderItems();
  } catch {
    showHUD("No picture selected");
    return;
  }

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
    showHUD(`Only pictures with these extensions are supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
    return;
  }

  try {
    await applyWallpaperUpdate(file.path);
    showHUD("Wallpaper updated");
  } catch (error) {
    await showWallpaperError(error);
  }
}
