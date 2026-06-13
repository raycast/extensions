import {
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  showHUD,
  closeMainWindow,
  LaunchProps,
} from "@raycast/api";
import * as os from "os";
import * as path from "path";
import { RequestError } from "@octokit/request-error";
import { formatUrl, uploadImageBuffer, takeScreenshot } from "./utils";

/**
 * Main command: Take screenshot and upload to GitHub
 * Uses macOS native screencapture command
 */
export default async function Command(
  props: LaunchProps<{ arguments: Arguments.UploadScreenshot }>,
) {
  const preferences = getPreferenceValues<Preferences.UploadScreenshot>();
  const { imageName } = props.arguments;

  // Prepare temp file path for screenshot output
  const screenshotPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);

  // Start screencapture (non-blocking spawn)
  const screenshotPromise = takeScreenshot(screenshotPath);

  // Close Raycast window so user can see the screen for selection
  await closeMainWindow({ clearRootSearch: true });

  // Wait for screencapture to finish (user completes selection or cancels)
  const buffer = await screenshotPromise;

  if (!buffer) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Screenshot cancelled",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uploading screenshot...",
  });

  try {
    const url = await uploadImageBuffer(
      buffer,
      "png",
      preferences,
      imageName || "",
    );
    const formattedUrl = formatUrl(url, preferences.defaultFormat);

    await Clipboard.copy(formattedUrl);

    toast.style = Toast.Style.Success;
    toast.title = "Screenshot uploaded!";
    toast.message = "URL copied to clipboard";

    await showHUD("✅ Screenshot uploaded! URL copied to clipboard");
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
