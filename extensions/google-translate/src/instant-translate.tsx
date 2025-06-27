import { getPreferenceValues, getSelectedText, showHUD, Clipboard } from "@raycast/api";
import { simpleTranslate } from "./simple-translate";
import { LanguageCode } from "./languages";

// Helper function to show HUD for a longer duration based on text length
async function showExtendedHUD(message: string, minDurationMs = 2000) {
  await showHUD(message);

  // Calculate duration based on message length
  // Assuming average reading speed of 150ms per character (adjust as needed)
  const readingTimePerChar = 150; // milliseconds
  const calculatedDuration = Math.max(minDurationMs, message.length * readingTimePerChar);

  // Cap maximum duration to avoid excessive waiting
  const maxDuration = 15000; // 15 seconds max
  const finalDuration = Math.min(calculatedDuration, maxDuration);

  // Show the same message multiple times with a delay to extend visibility
  const intervalTime = 1000; // Refresh every 1 second
  const iterations = Math.floor(finalDuration / intervalTime);

  for (let i = 0; i < iterations; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalTime));
    await showHUD(message);
  }
}

export default async function InstantTranslate() {
  try {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    const targetLanguage = preferences.lang2; // Use secondary language as target
    const sourceLanguage = preferences.lang1 === "auto" ? "auto" : preferences.lang1;
    const defaultAction = preferences.defaultAction; // Can be "copy", "paste", or "show"
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

    // Use the existing Google Translate implementation
    const result = await simpleTranslate(selectedText, {
      langFrom: sourceLanguage as LanguageCode,
      langTo: [targetLanguage as LanguageCode],
      proxy: proxy,
    });

    if (result && result.translatedText) {
      const translation = result.translatedText;

      // Handle different action types
      switch (defaultAction) {
        case "copy":
          await Clipboard.copy(translation);
          await showHUD(`✓ Copied To Clipboard`);
          break;

        case "paste":
          await Clipboard.paste(translation);
          await showHUD(`✓ Pasted`);
          break;

        case "show":
        default:
          // Just show the translation without copying or pasting
          await showExtendedHUD(translation);
          break;
      }
    } else {
      throw new Error("Translation not found in response");
    }
  } catch (error) {
    console.error("Translation error:", error);
    await showHUD("Translation failed. Please try again.");
  }
}
