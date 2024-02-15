import { showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";

import { captureScreenshot, sendScreenshotToGPTVision } from "./utils";

export default async () => {
  try {
    const voiceCommand = (await Clipboard.read()).text;

    console.log("Voice command", voiceCommand);

    await closeMainWindow();

    const screenshotPath = await captureScreenshot();

    console.log("Captured screenshot at", screenshotPath);

    const imageResult = await sendScreenshotToGPTVision(screenshotPath, voiceCommand);

    console.log("Image result", imageResult);

    await Clipboard.copy(imageResult);

    console.log("Copied to clipboard", imageResult);

    await Clipboard.paste(imageResult);

    await showToast({ title: "Result", message: "Copied to clipboard & Pasted", style: Toast.Style.Success });
  } catch (error) {
    console.error("Error", error);

    await showToast({ title: "Error", message: String(error), style: Toast.Style.Failure });
  }
};
