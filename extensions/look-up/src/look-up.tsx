import { getPreferenceValues, getSelectedText, showHUD, Clipboard } from "@raycast/api";
import fetch from "node-fetch";

// Helper function to show HUD for a longer duration based on text length
async function showExtendedHUD(message: string, minDurationMs: number = 3000) {
  await showHUD(message);

  // Calculate duration based on message length
  // Assuming average reading speed of 200ms per character (adjust as needed)
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

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const targetLanguage = preferences.targetLanguage;
    const sourceLanguage = preferences.sourceLanguage === "auto" ? "auto" : preferences.sourceLanguage;
    const enableCopyToClipboard = preferences.enableCopyToClipboard || false;

    // Get the selected text from any active application
    const selectedText = await getSelectedText().catch((error) => {
      console.error("Error getting selected text:", error);
      return "";
    });

    if (!selectedText || selectedText.trim().length === 0) {
      await showExtendedHUD("No text selected. Please select text to translate.", 2000);
      return;
    }

    await showHUD("Translating...");

    // Use unofficial Google Translate API
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(selectedText)}`,
    ).catch((error) => {
      console.error("Network error during translation:", error);
      throw new Error("Network error. Please check your internet connection.");
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json().catch((error) => {
      console.error("Error parsing translation response:", error);
      throw new Error("Failed to parse translation response");
    });

    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const result = data[0][0][0];

      // Copy to clipboard if enabled
      if (enableCopyToClipboard) {
        await Clipboard.copy(result);
        await showExtendedHUD(`${result}\n(Copied to clipboard)`, 3000);
      } else {
        // Show the translation result with dynamic duration based on length
        await showExtendedHUD(result, 3000);
      }
    } else {
      throw new Error("Translation not found in response");
    }
  } catch (error) {
    console.error("Translation error:", error);
    await showExtendedHUD("Translation failed. Please try again.", 2000);
  }
}
