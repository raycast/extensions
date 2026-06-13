import {
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  showHUD,
  LaunchProps,
} from "@raycast/api";
import { RequestError } from "@octokit/request-error";
import { formatUrl, uploadImageBuffer, getImageFromClipboard } from "./utils";

/**
 * Main command: Upload image from clipboard to GitHub (quick mode)
 */
export default async function Command(
  props: LaunchProps<{ arguments: Arguments.UploadFromClipboard }>,
) {
  const preferences = getPreferenceValues<Preferences.UploadFromClipboard>();
  const { imageName } = props.arguments;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uploading image...",
  });

  try {
    const image = await getImageFromClipboard();

    if (!image) {
      throw new Error(
        "No image found in clipboard. Please copy an image first.",
      );
    }

    const url = await uploadImageBuffer(
      image.buffer,
      image.ext,
      preferences,
      imageName || "",
    );
    const formattedUrl = formatUrl(url, preferences.defaultFormat);

    await Clipboard.copy(formattedUrl);

    toast.style = Toast.Style.Success;
    toast.title = "Image uploaded!";
    toast.message = "URL copied to clipboard";

    await showHUD("✅ Image uploaded! URL copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;

    if (error instanceof RequestError) {
      toast.title = "GitHub API Error";
      toast.message = error.message;
    } else if (error instanceof Error) {
      toast.title = "Upload Failed";
      toast.message = error.message;
    } else {
      toast.title = "Upload Failed";
      toast.message = "Unknown error occurred";
    }
  }
}
