import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import ocr from "./ocr";
import utils from "./utils";
import takeScreenshot from "./screenshot";

const ocrEngine = getPreferenceValues<Preferences>().ocrEngine;

export default async function main() {
  const isTesseractInstalled = await utils.isTesseractInstalled();

  if (ocrEngine === "googleCloudVision") {
    const valid = await utils.checkGoogleCredentials();

    if (!valid) {
      await openExtensionPreferences();
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Google Cloud info",
        message: "Missing Google Cloud info",
      });
      return;
    }
  }

  if (ocrEngine === "tesseractOcr") {
    if (!isTesseractInstalled) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tesseract not found, check README!",
        message: "Tesseract path not found or it is not installed, check README for more info!",
      });
      return;
    }
  }

  await closeMainWindow();
  const filePath = await takeScreenshot();

  try {
    let text = await ocr[ocrEngine](filePath);
    text = utils.handleNewLines(text);

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found on image!",
        message: "No text found on image!",
      });
      return;
    }

    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Text copied to clipboard!",
      message: "Text copied to clipboard!",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to OCR the image!",
      message: "Failed to OCR the image!",
    });
  }
}
