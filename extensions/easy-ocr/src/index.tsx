import fs from "fs";
import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import tesseractOcr from "./ocr";
import visionOcr from "./vision";
import utils from "./utils";
import takeScreenshot from "./screenshot";
import { detect, LanguageCodeFormat } from "raycast-language-detector";

export default async function main() {
  if (getPreferenceValues<Preferences>().ocr_engine === "vision") {
    await recognizeWithVision();
    return;
  }

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
      (await utils.isInstalledLanguage(autodetectLanguage?.languageCode)) &&
      autodetectLanguage?.languageCode !== defaultLangCode
    ) {
      try {
        text = await tesseractOcr(filePath, autodetectLanguage?.languageCode);
        text = utils.handleNewLines(text);
        languageUsed = autodetectLanguage?.languageName ?? languageUsed;
      } catch {
        // Keep the first OCR result when the autodetected language cannot be loaded by Tesseract.
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

async function recognizeWithVision() {
  await closeMainWindow();
  const filePath = await takeScreenshot();

  // The selection was cancelled with Esc, so there is nothing to read.
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    const text = utils.handleNewLines(await visionOcr(filePath));

    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: `No text found on image!`,
        message: `No text found on image!`,
      });
      return;
    }

    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Text copied to clipboard! Engine: Apple Vision",
      message: "Text copied to clipboard! Engine: Apple Vision",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to OCR the image!",
      message: e instanceof Error ? e.message : "Failed to OCR the image!",
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
