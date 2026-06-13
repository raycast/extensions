import {
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  closeMainWindow,
  open,
  environment,
  LaunchProps,
} from "@raycast/api";
import * as os from "os";
import * as path from "path";
import { RequestError } from "@octokit/request-error";
import {
  Preferences,
  Arguments,
  uploadImageBuffer,
  takeScreenshot,
} from "./utils";

/**
 * Main command: Take screenshot, upload, then open format picker
 *
 * This is a no-view command that:
 * 1. Takes screenshot (same as upload-screenshot)
 * 2. Uploads to GitHub
 * 3. Opens the format picker via Deep Link
 */
export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const { imageName } = props.arguments;

  // Prepare temp file path for screenshot output
  const screenshotPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);

  // Start screencapture (non-blocking spawn)
  const screenshotPromise = takeScreenshot(screenshotPath);

  // Close Raycast window so user can see the screen for selection
  await closeMainWindow({ clearRootSearch: true });

  // Wait for screencapture to finish
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

    toast.style = Toast.Style.Success;
    toast.title = "Screenshot uploaded!";

    // Copy raw URL to clipboard first, then open format picker
    await Clipboard.copy(url);

    // Open the format picker command via Deep Link, passing the URL
    const context = JSON.stringify({ url });
    const encodedContext = encodeURIComponent(context);
    await open(
      `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/choose-format?launchContext=${encodedContext}`,
    );
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
