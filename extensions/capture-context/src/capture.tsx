import { getSelectedText } from "@raycast/api";
import { createCapture, utils, CONFIG } from "./utils";

export default async function Command() {
  await createCapture("selection", async () => {
    const timestamp = new Date().toISOString();
    const screenshotPath = await utils.captureScreenshot(
      CONFIG.directories.captures,
      utils.sanitizeTimestamp(timestamp),
    );

    let selectedText: string | null = null;
    try {
      selectedText = await getSelectedText();
    } catch {
      console.info("No text selected");
    }

    return {
      selectedText,
      screenshotPath: screenshotPath ? utils.getFileUrl(screenshotPath) : null,
    };
  });
}
