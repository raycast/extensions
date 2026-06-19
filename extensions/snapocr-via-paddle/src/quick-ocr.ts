import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { recognizeText } from "./api";
import { ScreenshotCancelledError, takeScreenshot } from "./screenshot";
import { cleanupScreenshot, postProcessText } from "./utils";

export default async function Command() {
  await closeMainWindow();

  let screenshotPath: string;
  try {
    screenshotPath = await takeScreenshot();
  } catch (error) {
    if (error instanceof ScreenshotCancelledError) {
      return;
    }
    await showToast({ style: Toast.Style.Failure, title: "Screenshot failed", message: String(error) });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Recognizing text..." });

  try {
    const result = await recognizeText(screenshotPath);
    const text = postProcessText(result.text);

    if (!text) {
      toast.style = Toast.Style.Failure;
      toast.title = "No text detected";
      return;
    }

    await Clipboard.copy(text);
    await showHUD("Text copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Recognition failed";
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    await cleanupScreenshot(screenshotPath);
  }
}
