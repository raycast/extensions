import { getSelectedFinderItems } from "@raycast/api";
import { openWithToast } from "./shared";

export default async function OpenSelected() {
  const items = await getSelectedFinderItems();
  const file = items.find((item) => item.path);
  if (!file) throw new Error("Select a molecular file in Finder first.");
  await openWithToast(file.path);
}
