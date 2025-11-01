import {
  recognizeText as recognizeTextSwift,
  detectBarcode as detectBarcodeSwift,
} from "swift:../swift";
import { getUserSelectedLanguages, usePreferences } from "./hooks";

export const recognizeText = async (isFullScreen = false) => {
  const preference = usePreferences();

  try {
    const languages = await getUserSelectedLanguages();

    const recognizedText = await recognizeTextSwift(
      isFullScreen,
      preference.keepImage,
      preference.ocrMode === "fast",
      preference.languageCorrection,
      preference.ignoreLineBreaks,
      preference.customWordsList ? preference.customWordsList.split(",") : [],
      languages.map((lang) => lang.value),
    );

    return recognizedText;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to recognize text");
  }
};

export const detectBarcode = async () => {
  const preference = usePreferences();

  try {
    const detectedCodes = await detectBarcodeSwift(preference.keepImage);

    return detectedCodes;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to detect barcode");
  }
};
