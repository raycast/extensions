import { Clipboard } from "@raycast/api";
import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { generateDescription } from "@utils/generateDescription";
import { handleError } from "@utils/handleError";

import { showSuccess } from "@utils/showSuccess";

export default async function generateAltTextFromURLCMD(
  props: LaunchProps<{ arguments: Arguments.GenerateFromURLCMD }>,
) {
  try {
    await closeMainWindow({ clearRootSearch: true });
    await showToast({
      style: Toast.Style.Animated,
      title: "Generating alt text for this image...",
    });
    const { url } = props.arguments;

    const proxyUrl = new URL(url);

    const imageUrl = proxyUrl.searchParams.get("url") || url;

    const imageDescription = await generateDescription({ isLocalImagePath: false, url: imageUrl! });

    if (!imageDescription) {
      throw new Error("No description generated");
    }

    await Clipboard.copy(imageDescription);
    await showSuccess(`Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    handleError(error);
  }
}
