import { generateDescription } from "@utils/generateDescription";
import { showError } from "@utils/showError";
import { showSuccess } from "@utils/showSuccess";
import { Clipboard } from "@raycast/api";
import { showToast, Toast, closeMainWindow, LaunchProps } from "@raycast/api";

export default async function generateAltTextFromURLCMD(
  props: LaunchProps<{ arguments: Arguments.GenerateFromURLCMD }>,
) {
  await closeMainWindow({ clearRootSearch: true });
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating alt text for this image...",
  });
  const { url } = props.arguments;

  console.log(`URL: ${decodeURIComponent(url)}`);
  const proxyUrl = new URL(url);
  const imageUrl = proxyUrl.searchParams.get("url");
  console.log(`image url ${imageUrl}`);

  try {
    const imageDescription = await generateDescription({ isLocalImagePath: false, url: imageUrl! });

    if (!imageDescription) {
      throw new Error("No description generated");
    }

    await Clipboard.copy(imageDescription);
    await showSuccess(`📋 Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    await showError(error, { title: "Failed to generate alt text from URL. Try copying image to clipboard" });
  }
}
