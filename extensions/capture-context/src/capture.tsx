import { getSelectedText } from "@raycast/api";
import { CaptureService, FileService, CONFIG } from "./utils";

export default async function Command() {
  await CaptureService.capture({
    type: "context",
    getData: async () => {
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const screenshotPath = await FileService.captureScreenshot(CONFIG.saveDir, timestamp);

      let selectedText: string | null = null;
      try {
        selectedText = await getSelectedText();
      } catch {
        console.info("No text selected");
      }

      return {
        text: selectedText,
        screenshot: screenshotPath,
      };
    },
  });
}
