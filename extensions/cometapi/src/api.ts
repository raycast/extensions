import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const preferences = getPreferenceValues<Preferences>();

function sanitizeApiKey(key: string) {
  return (
    (key || "")
      .trim()
      // Remove a leading "Bearer " prefix.
      .replace(/^Bearer\s+/i, "")
      // Remove wrapping quotes.
      .replace(/^['"]+|['"]+$/g, "")
      // Remove all whitespace (spaces, tabs, newlines).
      .replace(/\s+/g, "")
  );
}

// Sanitize once at startup; if you change preferences, please relaunch the command.
const apiKey = sanitizeApiKey(preferences.apikey);
if (!apiKey) {
  throw new Error(
    "CometAPI API Key is missing. Open Raycast → Extensions → CometAPI → Configure and set 'CometAPI API Key'.",
  );
}

export const openai = new OpenAI({
  apiKey,
  // Ensure trailing slash to avoid any path-join edge cases
  baseURL: "https://api.cometapi.com/v1/",
});

export const getGlobalModel = () => (preferences.model || "gpt-5-mini").trim();
export const getApiKey = () => apiKey;

export const getApiKeyFingerprint = () => {
  const len = apiKey.length;
  const last4 = len > 4 ? apiKey.slice(-4) : apiKey;
  return { length: len, last4 };
};
