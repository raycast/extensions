import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

// Try to get API key from preferences
let apiKey: string | undefined;
try {
  const preferences = getPreferenceValues<Preferences>();
  apiKey = preferences.GOOGLE_GENERATIVE_AI_API_KEY;
} catch (error) {
  console.log("Could not load preferences");
}

// If neither worked, API key will be undefined
export const GOOGLE_GENERATIVE_AI_API_KEY = apiKey || "";

// Function to validate necessary configuration
export function validateConfig() {
  if (!GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "Google API Key is missing. Please either set it in Raycast preferences under Extensions > rename.ai > Settings, or add it to a .env file in the extension directory with format GOOGLE_GENERATIVE_AI_API_KEY=your_api_key",
    );
  }
}
