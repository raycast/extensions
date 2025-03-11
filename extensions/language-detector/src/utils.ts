import { getPreferenceValues } from "@raycast/api";
import { Detector, detect } from "raycast-language-detector";

export const emptyResult = { languageCode: "", languageName: "Unknown" };

export const supportedDetectors: Detector[] = [Detector.AI, Detector.LanguageDetect, Detector.TinyLD];

export const { detector } = getPreferenceValues<ExtensionPreferences>();

export const detectLanguage = async (text: string, preferredDetector?: Detector) => {
  const selectedDetector = preferredDetector ?? detector;
  const detectors = supportedDetectors.slice().sort((a, b) => {
    if (a === selectedDetector) return -1;
    if (b === selectedDetector) return 1;
    if (selectedDetector !== Detector.AI && a === Detector.AI) return 1;
    if (selectedDetector !== Detector.AI && b === Detector.AI) return -1;
    return 0;
  });
  const result = await detect(text, { detectors }).catch(() => emptyResult);
  if (result) return result;
  return emptyResult;
};
