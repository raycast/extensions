import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import tesseractOcr from "./ocr";
import utils from "./utils";
import takeScreenshot from "./screenshot";
import { detect, LanguageCodeFormat } from "raycast-language-detector";

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
        title: `No text found on image!`,
        message: `No text found on image!`,
      });
      return;
    }

    const autodetectLanguage = await autoDetectedLanguage(text);

    if (
      autodetectLanguage?.languageCode &&
      utils.isValidLanguage(autodetectLanguage?.languageCode) &&
      autodetectLanguage?.languageCode !== defaultLangCode
    ) {
      text = await tesseractOcr(filePath, autodetectLanguage?.languageCode);
      text = utils.handleNewLines(text);
    }

    languageUsed = autodetectLanguage?.languageName ?? languageUsed;

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

async function autoDetectedLanguage(text: string) {
  if (!getPreferenceValues<Preferences>().autodetect_lang) {
    return;
  }

  // Detect language
  return detect(text, {
    languageCodeFormat: LanguageCodeFormat.ISO_639_3,
  });
}
