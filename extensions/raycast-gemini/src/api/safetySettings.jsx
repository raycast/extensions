import { getPreferenceValues } from "@raycast/api";

/**
 * Get the configured safety settings for Gemini API calls
 * @returns {Array} Array of safety settings with the user's preferred threshold
 */
export function getSafetySettings() {
  const { safetyThreshold } = getPreferenceValues();

  return [
    // Derogatory: Negative or harmful comments targeting identity and/or protected attributes
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: safetyThreshold },

    // Toxic: Content that is rude, disrespectful, or profane
    { category: "HARM_CATEGORY_HARASSMENT", threshold: safetyThreshold },

    // Sexual: Contains references to sexual acts or other lewd content
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: safetyThreshold },

    // Violent: Describes scenarios depicting violence against an individual or group
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: safetyThreshold },

    // Dangerous: Promotes, facilitates, or encourages harmful acts
    { category: "HARM_CATEGORY_DANGEROUS", threshold: safetyThreshold },
  ];
}
