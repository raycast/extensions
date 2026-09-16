import { getPreferenceValues } from "@raycast/api";
import { getUserSelectedLanguages } from "../hooks";
import {
  detectBarcode as detectBarcodeSwift,
  recognizeText as recognizeTextSwift,
} from "swift:../../swift";

export const recognizeText = async (isFullScreen = false) => {
  const preference = getPreferenceValues<Preferences>();

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
      Boolean(preference.playSound),
    );

    return recognizedText;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to recognize text");
  }
};

export const detectBarcode = async () => {
  const preference = getPreferenceValues<Preferences>();

  try {
    const detectedCodes = await detectBarcodeSwift(
      preference.keepImage,
      Boolean(preference.playSound),
    );

    return detectedCodes;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to detect barcode");
  }
};
