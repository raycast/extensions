import { getPreferenceValues, getSelectedFinderItems } from "@raycast/api";
import type { Preferences } from "./types";
import {
  validatePreferences,
  validateFile,
  showNoFileSelectedToast,
  showUploadingToast,
  uploadFile,
  handleSuccessfulUpload,
  handleError,
} from "./utils";

/**
 * Main command function for the Chibisafe Uploader extension
 */
export default async function command() {
  try {
    // Get preferences
    const preferences = getPreferenceValues<Preferences>();

    // Validate preferences
    if (!(await validatePreferences(preferences))) {
      return;
    }

    // Get selected file in Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showNoFileSelectedToast();
      return;
    }

    const filePath = selectedItems[0].path;

    // Validate file exists
    if (!(await validateFile(filePath))) {
      return;
    }

    // Show uploading toast
    const toast = await showUploadingToast(filePath);

    // Upload file
    const result = await uploadFile(filePath, preferences);

    // Handle successful upload
    await handleSuccessfulUpload(result.url, toast);
  } catch (error) {
    // Handle errors
    await handleError(error);
  }
}
