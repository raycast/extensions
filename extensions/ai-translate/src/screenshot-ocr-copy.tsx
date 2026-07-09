import { Clipboard, showHUD } from "@raycast/api";
import { recognizeScreenshotText } from "./ocr-engines";
import { OcrCancelledError } from "./ocr-errors";
import { readPreferences } from "./preferences";

export default async function Command() {
  const preferences = readPreferences();

  try {
    // No leading HUD: screencapture -i shows its own crosshair, and a "Recognizing
    // text…" toast that fires before the user finishes dragging the selection is
    // misleading (flagged by Greptile review).
    const result = await recognizeScreenshotText(preferences);

    if (!result) {
      await showHUD("No text detected");
      return;
    }

    await Clipboard.copy(result);
    await showHUD(`Copied · ${result.length} chars`);
  } catch (error) {
    if (error instanceof OcrCancelledError) return;
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`OCR failed — ${message.slice(0, 80)}`);
  }
}
