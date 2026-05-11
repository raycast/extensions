import { getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { simpleTranslate } from "./simple-translate";
import { LanguageCode } from "./languages";

// Reading time per character based on average reading speed of ~200 words per minute
const READING_TIME_PER_CHAR_MS = 150;

// HUD display constants
const MIN_HUD_DURATION_MS = 2000;
const MAX_HUD_DURATION_MS = 15000;
const HUD_REFRESH_INTERVAL_MS = 1000;

// Helper function to show HUD for a longer duration based on text length
export async function showExtendedHUD(message: string, minDurationMs = MIN_HUD_DURATION_MS) {
  await showHUD(message);

  // Calculate duration based on message length
  const calculatedDuration = Math.max(minDurationMs, message.length * READING_TIME_PER_CHAR_MS);

  // Cap maximum duration to avoid excessive waiting
  const finalDuration = Math.min(calculatedDuration, MAX_HUD_DURATION_MS);

  // Show the same message multiple times with a delay to extend visibility
  const iterations = Math.floor(finalDuration / HUD_REFRESH_INTERVAL_MS);

  for (let i = 0; i < iterations; i++) {
    await new Promise((resolve) => setTimeout(resolve, HUD_REFRESH_INTERVAL_MS));
    await showHUD(message);
  }
}

// Base function for instant translation logic
export async function baseInstantTranslate(onTranslated: (translatedText: string) => Promise<void>) {
  try {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    const targetLanguage = preferences.lang2; // Use secondary language as target
    const sourceLanguage = preferences.lang1;
    const proxy = preferences.proxy;

    // Get the selected text from any active application
    const selectedText = await getSelectedText().catch((error) => {
      console.error("Error getting selected text:", error);
      return "";
    });

    if (!selectedText || selectedText.trim().length === 0) {
      await showHUD("No text selected. Please select text to translate.");
      return;
    }

    await showHUD("Translating...");

    const result = await simpleTranslate(selectedText, {
      langFrom: sourceLanguage as LanguageCode,
      langTo: [targetLanguage as LanguageCode],
      proxy: proxy,
    });

    if (result && result.translatedText) {
      const translation = result.translatedText;
      await onTranslated(translation);
    } else {
      throw new Error("Translation not found in response");
    }
  } catch (error) {
    console.error("Translation error:", error);
    await showHUD("Translation failed. Please try again.");
  }
}
