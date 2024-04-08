import { getSelectedFinderItems } from "@raycast/api";

export async function getSelectedFinderPaths(): Promise<string[]> {
  return getSelectedFinderItems()
    .then((items) => {
      return items.map((item) => item.path);
    })
    .catch(() => {
      return [];
    });
}
