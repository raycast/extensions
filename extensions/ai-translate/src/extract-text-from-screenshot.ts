import { Clipboard, PopToRootType, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { recognizeScreenshotText } from "./ocr-engines";
import { readPreferences } from "./preferences";

export default async function command() {
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });

  try {
    const preferences = readPreferences();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading screenshot text...",
      message: ocrEngineTitle(preferences.ocrEngine),
    });
    const recognizedText = await recognizeScreenshotText(preferences);
    if (!recognizedText) {
      toast.hide();
      await showHUD("No text detected");
      return;
    }

    await Clipboard.copy(recognizedText);
    toast.hide();
    await showHUD("Extracted text copied to Clipboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`OCR failed: ${message}`);
  }
}

function ocrEngineTitle(engine: string): string {
  switch (engine) {
    case "local":
      return "Local macOS Vision";
    case "tesseract":
      return "Tesseract";
    case "baidu":
      return "Baidu OCR";
    case "paddle":
      return "PaddleOCR HTTP";
    case "mineru":
      return "MinerU Agent";
    default:
      return engine;
  }
}
