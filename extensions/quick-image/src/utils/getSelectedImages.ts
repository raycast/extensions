import { getSelectedFinderItems } from "@raycast/api";
import filePath from "node:path";
import { getInputExts } from "./getInputExts";

const EXTS = getInputExts();

/**
 * Gets selected images in the Finder file manager application.
 *
 * @returns A promise resolving to the list of selected image paths.
 */
export async function getSelectedImages(): Promise<string[]> {
  const items = await getSelectedFinderItems();
  const notSupportedExts = new Set();
  for (const item of items) {
    const ext = filePath.extname(item.path).slice(1).toLowerCase();
    if (!EXTS.includes(ext)) {
      notSupportedExts.add(ext);
    }
  }
  if (notSupportedExts.size > 0) {
    throw new Error(`Exts ${Array.from(notSupportedExts).join(", ")} are not supported`);
  }
  return items.map(({ path }) => path);
}
