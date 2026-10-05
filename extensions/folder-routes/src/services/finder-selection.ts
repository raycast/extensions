import { getSelectedFinderItems } from "@raycast/api";

export async function getFinderSelection(): Promise<string[]> {
  const items = await getSelectedFinderItems();
  return items.map((item) => item.path);
}
