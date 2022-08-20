import { getSelectedFinderItems } from "@raycast/api"

export const grabFile = async () => {
  const items = await getSelectedFinderItems();
  if(items.length > 0) return items;
  else return [];
}