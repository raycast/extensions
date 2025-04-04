import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import tesseractOcr from "./ocr";
import utils from "./utils";
import takeScreenshot from "./screenshot";
import { franc } from "franc";

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

  let defaultLangCode = getPreferenceValues<Preferences>().tesseract_lang.toLowerCase();

  // Fallback to English if user hasn't provided valid language is provided in extension options
  if (!utils.isValidLanguage(defaultLangCode)) {
    defaultLangCode = "eng";
  }

  await closeMainWindow();
  const filePath = await takeScreenshot();

  try {
    let text = await tesseractOcr(filePath, defaultLangCode);
    text = utils.handleNewLines(text);

    let languageUsed = defaultLangCode;
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: `No text found on image! Language: ${languageUsed}`,
        message: `No text found on image! Language: ${languageUsed}`,
      });
      return;
    }

    if (getPreferenceValues<Preferences>().autodetect_lang) {
      // Detect language
      const detectedLangCode = franc(text);

      if (utils.isValidLanguage(detectedLangCode) && detectedLangCode !== defaultLangCode) {
        text = await tesseractOcr(filePath, detectedLangCode);
        text = utils.handleNewLines(text);
        languageUsed = detectedLangCode;
      }
    }

    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: `Text copied to clipboard! Language: ${languageUsed}`,
      message: `Text copied to clipboard! Language: ${languageUsed}`,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to OCR the image!",
      message: "Failed to OCR the image!",
    });
  }
}
