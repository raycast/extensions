import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";

const TEMP_FILE = path.join(__dirname, "cut-files.json");

export default async function Command() {
  try {
    const selectedFiles = await getSelectedFinderItems();
    if (selectedFiles.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files selected" });
      return;
    }

    const filePaths = selectedFiles.map((file) => file.path);
    fs.writeFileSync(TEMP_FILE, JSON.stringify(filePaths));

    await showHUD(`Cut ${filePaths.length} file${filePaths.length > 1 ? "s" : ""}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to cut files", message: String(error) });
  }
}
