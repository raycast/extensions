import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { exec } from "child_process";
import supportedExtensions from "./supportedExtensions";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    for (const selectedItem of selectedItems) {
      const filePath = selectedItem.path;
      const fileExtension = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
      if (supportedExtensions.includes(fileExtension)) {
        exec(`open -a "TextEdit" "${filePath}"`);
      } else {
        await showHUD(`❌ Unsupported File Extension(s)`);
      }
    }
  } catch (error) {
    await showHUD("❌ Please select a file");
  }
}
