import { getSelectedFinderItems } from "@raycast/api";

export async function getFinderFiles(): Promise<string[]> {
  if (process.platform !== "darwin") {
    throw new Error("Finder selection is only available on macOS. Use Upload to Litterbox to choose files instead.");
  }
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    throw new Error("Could not read the Finder selection. Select files in Finder, then run this command again.");
  }
  const files = [...new Set(items.map((item) => item.path))];
  if (!files.length) {
    throw new Error("No files selected. Select files in Finder, then run this command again.");
  }
  return files;
}
