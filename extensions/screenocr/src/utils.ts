import {
  recognizeText as recognizeTextSwift,
  detectBarcode as detectBarcodeSwift,
} from "swift:../swift";
import { getUserSelectedLanguages } from "./hooks";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";

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

export const showSuccessToast = async (title: string) => {
  const preference = getPreferenceValues<Preferences>();

  if (preference.showToast) {
    await showToast({
      style: Toast.Style.Success,
      title,
    });
  }
};

export const showFailureToast = async (title: string) => {
  const preference = getPreferenceValues<Preferences>();

  if (preference.showToast) {
    await showToast({
      style: Toast.Style.Failure,
      title,
    });
  }
};
