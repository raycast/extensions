import { showToast, Toast, open, getPreferenceValues, getSelectedFinderItems } from "@raycast/api";
import { uploadToFileIo, searchImage } from "./common/imageUtils";
import fs from "fs";

export default async function main() {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();

  // Get the selected items in Finder
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast(Toast.Style.Failure, "No image selected in Finder.");
      return;
    }

    const selectedImagePath = selectedItems[0].path;

    if (!fs.existsSync(selectedImagePath)) {
      await showToast(Toast.Style.Failure, "Selected file does not exist.");
      return;
    }

    try {
      // Step 1: Upload the image to File.io
      const fileIoUrl = await uploadToFileIo(selectedImagePath);
      await showToast(Toast.Style.Success, "Image uploaded to File.io");

      // Step 2: Search the image on SauceNAO using the File.io URL
      const searchUrl = await searchImage(apiKey, fileIoUrl);

      // Open the SauceNAO results in the default browser
      await showToast(Toast.Style.Success, "Opening SauceNAO results...");
      await open(searchUrl);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to search for image.");
      console.error(error);
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Finder is not active");
    console.error(error);
  }
}
