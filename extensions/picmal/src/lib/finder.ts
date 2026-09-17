import { getSelectedFinderItems } from "@raycast/api";

/**
 * Return the paths of the items currently selected in Finder, or an empty array
 * if nothing is selected / Finder isn't frontmost. Never throws — a failed
 * lookup just means "no prefill".
 */
export async function selectedFinderPaths(): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path);
  } catch {
    return [];
  }
}
