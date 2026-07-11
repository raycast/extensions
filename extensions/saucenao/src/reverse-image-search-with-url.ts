import { showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { isImageURL, searchImage } from "./common/imageUtils";

export default async function main({ arguments: inputArgs }: { arguments: { imageUrl: string } }) {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();
  const { imageUrl } = inputArgs;

  // Step 1: Validate the input URL
  if (!imageUrl || imageUrl.trim() === "") {
    await showToast(Toast.Style.Failure, "Please provide a valid image URL.");
    return;
  }

  // Step 2: Validate the URL and check if it points to an image
  try {
    const isImage = await isImageURL(imageUrl);

    if (!isImage) {
      await showToast(Toast.Style.Failure, "Provided URL is not a supported image.");
      return;
    }

    // Step 3: If the URL is valid, use it for SauceNAO search
    const searchUrl = await searchImage(apiKey, imageUrl);
    await showToast(Toast.Style.Success, "Opening SauceNAO results...");
    await open(searchUrl);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to search for image.");
    console.error(error);
  }
}
