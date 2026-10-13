import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";
import { extname } from "node:path";
import { recognizeTextInFiles } from "swift:../swift";
import { deliverToClipboard, errorMessage, ocrOptionsFromPreferences } from "./lib/ocr";

const SUPPORTED = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".heic",
  ".heif",
  ".tiff",
  ".tif",
  ".gif",
  ".bmp",
  ".webp",
  ".pdf",
]);

export default async function Command() {
  let paths: string[];
  try {
    const items = await getSelectedFinderItems();
    paths = items.map((item) => item.path).filter((path) => SUPPORTED.has(extname(path).toLowerCase()));
  } catch {
    await showHUD("Select an image or PDF in Finder first");
    return;
  }

  if (paths.length === 0) {
    await showHUD("Select an image or PDF in Finder first");
    return;
  }

  await closeMainWindow();
  await showHUD(paths.length === 1 ? "Recognizing…" : `Recognizing ${paths.length} files…`);

  try {
    const options = ocrOptionsFromPreferences();
    const result = await recognizeTextInFiles(
      paths,
      options.languages,
      options.autoDetectLanguage,
      options.mergeLines,
      options.tabBetweenColumns,
    );
    await deliverToClipboard(result);
  } catch (error) {
    await showHUD(`OCR failed: ${errorMessage(error)}`);
  }
}
