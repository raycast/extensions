import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  const selectedItems = await getSelectedFinderItems();
  if (selectedItems.length !== 1) {
    await showHUD("❌ Please select a single file");
    return;
  }

  const filePath = selectedItems[0].path;
  exec(`open -a "Fleet" "${filePath}"`);
}
