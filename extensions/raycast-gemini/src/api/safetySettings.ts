import { getPreferenceValues } from "@raycast/api";
import { HarmCategory, type HarmBlockThreshold, type SafetySetting } from "@google/genai";

interface SafetyPreferences {
  safetyThreshold: HarmBlockThreshold;
}

export function getSafetySettings(): SafetySetting[] {
  const { safetyThreshold } = getPreferenceValues<SafetyPreferences>();

  return [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: safetyThreshold },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: safetyThreshold },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: safetyThreshold },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: safetyThreshold },
  ];
}
