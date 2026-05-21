import { Clipboard, showHUD } from "@raycast/api";
import { recognizeScreenshotText } from "./ocr-engines";
import { readPreferences } from "./preferences";

export default async function Command() {
  const preferences = readPreferences();

  try {
    await showHUD("Recognizing text…");
    const result = await recognizeScreenshotText(preferences);

    if (!result) {
      await showHUD("No text detected");
      return;
    }

    await Clipboard.copy(result);
    await showHUD(`Copied · ${result.length} chars`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) return;
    await showHUD(`OCR failed — ${message.slice(0, 80)}`);
  }
}
