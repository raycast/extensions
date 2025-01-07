import { Clipboard } from "@raycast/api";
import { CaptureService, FileService, CONFIG } from "./utils";

export default async function Command() {
  await CaptureService.capture({
    type: "clipboard",
    getData: async () => {
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const screenshotPath = await FileService.captureScreenshot(CONFIG.saveDir, timestamp);
      const clipboardText = await Clipboard.readText();

      return {
        text: clipboardText,
        screenshot: screenshotPath,
      };
    },
    validate: (data) => (data.text ? true : "No text in clipboard"),
  });
}
