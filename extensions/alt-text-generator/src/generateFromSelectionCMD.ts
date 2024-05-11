import { getLocalImagePath } from "@utils/getPath";
import { generateDescription } from "@utils/generateDescription";
import { showError } from "@utils/showError";
import { showSuccess } from "@utils/showSuccess";
import { Clipboard } from "@raycast/api";
import { showToast, Toast, closeMainWindow } from "@raycast/api";

export default async function generateFromSelectionCMD() {
  await closeMainWindow({ clearRootSearch: true });
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating alt text for this image...",
  });

  try {
    const localImagePath = await getLocalImagePath();

    if (!localImagePath) {
      throw new Error("No image found in Finder selection");
    }

    const imageDescription = await generateDescription({ isLocalImagePath: true, path: localImagePath });

    if (!imageDescription) {
      throw new Error("No description generated");
    }

    await Clipboard.copy(imageDescription);
    await showSuccess(`📋 Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    await showError(error, { title: error as string });
  }
}
