import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import tesseractOcr from "./ocr";
import utils from "./utils";
import takeScreenshot from "./screenshot";

export default async function main() {
  const isTesseractInstalled = await utils.isTesseractInstalled();

  if (!isTesseractInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Tesseract not found, check README!",
      message: "Tesseract path not found or it is not installed, check README for more info!",
    });
    return;
  }

  await closeMainWindow();
  const filePath = await takeScreenshot();

  try {
    let text = await tesseractOcr(filePath);
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
