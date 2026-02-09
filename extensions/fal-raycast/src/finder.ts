import { getSelectedFinderItems } from "@raycast/api";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tiff",
  ".heic",
  ".heif",
  ".avif",
]);

export async function getSelectedImagePath() {
  try {
    const items = await getSelectedFinderItems();
    const imageItem = items.find((item) => {
      const lower = item.path.toLowerCase();
      for (const ext of IMAGE_EXTENSIONS) {
        if (lower.endsWith(ext)) {
          return true;
        }
      }
      return false;
    });
    return imageItem?.path;
  } catch {
    return undefined;
  }
}
