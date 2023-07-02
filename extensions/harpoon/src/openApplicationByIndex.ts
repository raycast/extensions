import { closeMainWindow, open, showHUD } from "@raycast/api";
import getItemByIndex from "./helpers/getItemByIndex";

export default async function openApplicationByIndex(index: number) {
  const item = await getItemByIndex(index).catch(async () => {
    await showHUD(`No application found at position ${index + 1}`);
  });

  if (item) {
    open(item.path, item.name);
  }

  await closeMainWindow();
}
