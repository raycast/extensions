import { Clipboard } from "@raycast/api";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { generateDescription } from "@utils/generateDescription";
import { getLocalImagePath } from "@utils/getPath";

import { showSuccess } from "@utils/showSuccess";
import { checkForValidFileType } from "@utils/checkForValidFileType";
import { handleError } from "@utils/handleError";

export default async function generateFromSelectionCMD() {
  try {
    await closeMainWindow({ clearRootSearch: true });

    await showToast({
      style: Toast.Style.Animated,
      title: "Generating alt text for this image...",
    });
    const localImagePath = await getLocalImagePath();
    console.log(localImagePath);

    const { isValid, fileType } = checkForValidFileType(localImagePath);

    if (!isValid) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const imageDescription = await generateDescription({ isLocalImagePath: true, path: localImagePath });

    await Clipboard.copy(imageDescription);
    await showSuccess(`Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    handleError(error);
  }
}
