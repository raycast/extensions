import { Clipboard } from "@raycast/api";
import { createCapture, utils, CONFIG } from "./utils";

export default async function Command() {
  await createCapture(
    "clipboard",
    async () => {
      const timestamp = new Date().toISOString();
      console.debug("Capturing with timestamp:", timestamp);

      const screenshotPath = await utils.captureScreenshot(
        CONFIG.directories.captures,
        utils.sanitizeTimestamp(timestamp),
      );
      console.debug("Got screenshot path:", screenshotPath);

      const clipboardText = await Clipboard.readText();
      console.debug("Got clipboard text:", clipboardText);

      return {
        selectedText: clipboardText,
        screenshotPath: screenshotPath ? utils.getFileUrl(screenshotPath) : null,
      };
    },
    (data) => (data.selectedText ? true : "No text in clipboard"),
  );
}
