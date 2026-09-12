import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { uploadFile } from "./shared/upload";
import fs from "fs";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({ title: "No file selected", style: Toast.Style.Failure });
      return;
    }

    if (!fs.statSync(selectedItems[0].path).isFile()) {
      await showToast({ title: "Selected item is not a file", style: Toast.Style.Failure });
      return;
    }

    await uploadFile(selectedItems[0].path);
  } catch (error) {
    await showToast({
      title: "Error selecting file",
      message: error instanceof Error ? error.message : String(error),
      style: Toast.Style.Failure,
    });
  }
}
