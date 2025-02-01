import { showHUD, getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { getSelectedText, replaceSelectedText, getLLMModel } from "./utils/common";

// Debug logging function
function log(message: string, data?: unknown) {
  console.log(`[Translate] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  secondaryLang: string;
  fixText: boolean;
}

// Initialize OpenAI client
let openai: OpenAI;

// Cache for translations
const translationCache = new Map<string, string>();

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  log("Starting translation with preferences", preferences);

  try {
    // Initialize OpenAI client
    if (!openai) {
      if (!preferences.openaiApiKey) {
        throw new Error("OpenAI API key is not set in preferences");
      }
      openai = new OpenAI({
        apiKey: preferences.openaiApiKey,
      });
      log("OpenAI client initialized");
    }

    // Get selected text
    const selectedText = await getSelectedText();
    log("Selected text", { length: selectedText?.length, text: selectedText });

    if (!selectedText || selectedText.trim().length === 0) {
      await showHUD("❌ No text selected - Please select some text to translate");
      return;
    }

    // Check cache
    const cacheKey = `${selectedText}_${preferences.primaryLang}_${preferences.secondaryLang}`;
    const cachedTranslation = translationCache.get(cacheKey);

    if (cachedTranslation) {
      log("Using cached translation");
      await replaceSelectedText(cachedTranslation);
      return;
    }

    // Show progress
    await showHUD("🌐 Translating...");

    // Create the translation prompt
    const prompt = `Translate this text between ${preferences.primaryLang} and ${preferences.secondaryLang}:
"${selectedText}"

Rules:
- First detect the source language between ${preferences.primaryLang}, ${preferences.secondaryLang}
- Translate to the other language
- If the source language is not ${preferences.primaryLang} or ${preferences.secondaryLang}, translate to ${preferences.primaryLang}
- Keep formatting and punctuation
- Preserve special characters and technical terms
- Match the original tone${preferences.fixText ? "\n- Fix any grammar, punctuation and spelling issues" : ""}

Respond ONLY with the translation, no explanations or language detection info.`;

    // Call OpenAI API for translation
    log("Calling OpenAI API for translation");
    const completion = await openai.chat.completions.create({
      model: getLLMModel(),
      messages: [
        {
          role: "system",
          content:
            "You are a translation assistant. Respond ONLY with the translated text, without any additional text, quotes, or explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const translation = completion.choices[0].message.content;
    log("Received translation", { length: translation?.length });

    if (!translation) {
      throw new Error("No translation received");
    }

    // Cache the result
    translationCache.set(cacheKey, translation);
    log("Translation cached");

    // Replace selected text
    log("Replacing selected text");
    await replaceSelectedText(translation);

    // Show success
    await showHUD("✅ Translation completed");
  } catch (error) {
    log("Error during translation", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "Unknown error occurred"));
  }
}
