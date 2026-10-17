import { getPreferenceValues } from "@raycast/api";
import { HarmCategory, type HarmBlockThreshold, type SafetySetting } from "@google/genai";

export function getSafetySettings(): SafetySetting[] {
  const { safetyThreshold } = getPreferenceValues<Preferences>();
  const threshold = safetyThreshold as HarmBlockThreshold;

  return [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold },
  ];
}
