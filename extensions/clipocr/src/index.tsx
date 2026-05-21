import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { unlink } from "fs/promises";
import tesseractOcr from "./ocr";
import utils from "./utils";
import takeScreenshot, { isScreenshotCancelledError } from "./screenshot";
import type { Preferences } from "./preferences";

export default async function main() {
  await closeMainWindow();

  const toastPromise = showToast({
    style: Toast.Style.Animated,
    title: "Select an area",
    message: "Use Windows Screen Snip to capture the text area.",
  });
  const screenshotPromise = takeScreenshot();
  screenshotPromise.catch(() => undefined);
  const toast = await toastPromise;

  let filePath: string | undefined;

  try {
    filePath = await screenshotPromise;
    toast.title = "Checking OCR setup";
    toast.message = "Looking for local Tesseract.";

    const isTesseractInstalled = await utils.isTesseractInstalled();

    if (!isTesseractInstalled) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tesseract not found, check README!";
      toast.message = "Tesseract path not found or it is not installed, check README for more info!";
      return;
    }

    let defaultLangCode = getPreferenceValues<Preferences>().tesseract_lang.toLowerCase().replace(/\s+/g, "");

    // Fall back to English if the configured language code is invalid.
    if (!utils.isValidLanguage(defaultLangCode)) {
      defaultLangCode = "eng";
    }

    toast.title = "Recognizing text";
    toast.message = "Running local Tesseract OCR.";

    let text = await tesseractOcr(filePath, defaultLangCode);
    text = utils.normalizeChinesePunctuation(text);
    text = utils.handleNewLines(text);

    let languageUsed = defaultLangCode;

    if (!text.trim()) {
      toast.style = Toast.Style.Failure;
      toast.title = "No text found on image!";
      toast.message = undefined;
      return;
    }

    const autodetectLanguage = defaultLangCode.includes("+") ? undefined : await autoDetectedLanguage(text);

    if (
      autodetectLanguage?.languageCode &&
      utils.isValidLanguage(autodetectLanguage?.languageCode) &&
      autodetectLanguage?.languageCode !== defaultLangCode
    ) {
      try {
        let detectedText = await tesseractOcr(filePath, autodetectLanguage.languageCode);
        detectedText = utils.normalizeChinesePunctuation(detectedText);
        detectedText = utils.handleNewLines(detectedText);

        if (detectedText.trim()) {
          text = detectedText;
          languageUsed = autodetectLanguage.languageName ?? autodetectLanguage.languageCode;
        }
      } catch {
        languageUsed = defaultLangCode;
      }
    }

    await Clipboard.copy(text);
    toast.style = Toast.Style.Success;
    toast.title = `Text copied to clipboard! Language: ${languageUsed}`;
    toast.message = `Text copied to clipboard! Language: ${languageUsed}`;
  } catch (e) {
    if (isScreenshotCancelledError(e)) {
      await toast.hide();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = filePath ? "Failed to OCR the image" : "Failed to capture screenshot";
    toast.message = getErrorMessage(e);
  } finally {
    if (filePath) {
      await removeTemporaryFile(filePath);
    }
  }
}

async function autoDetectedLanguage(text: string) {
  if (!getPreferenceValues<Preferences>().autodetect_lang) {
    return;
  }

  const { detect, LanguageCodeFormat } = await import("raycast-language-detector");

  // Detect language
  return detect(text, {
    languageCodeFormat: LanguageCodeFormat.ISO_639_3,
  });
}

async function removeTemporaryFile(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    // The OCR result is more important than failing on best-effort cleanup.
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
