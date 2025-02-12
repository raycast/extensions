import { showHUD, getPreferenceValues, LocalStorage } from "@raycast/api";
import OpenAI from "openai";
import { getSelectedText, replaceSelectedText, getLLMModel } from "./utils/common";
import { PRIMARY_LANG_KEY, SECONDARY_LANG_KEY, FIX_TEXT_KEY } from "./settings";
import { LANGUAGE_OPTIONS } from "./constants";

// Debug logging function
function log(message: string, data?: unknown) {
  console.log(`[Translate] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

function getLanguageName(code: string): string {
  return LANGUAGE_OPTIONS.find((lang) => lang.value === code)?.title || code;
}

interface Preferences {
  openaiApiKey: string;
}

// Initialize OpenAI client
let openai: OpenAI;

// Cache for translations
const translationCache = new Map<string, string>();

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Get language preferences from LocalStorage
  const primaryLanguage = (await LocalStorage.getItem<string>(PRIMARY_LANG_KEY)) || "en";
  const secondaryLanguage = (await LocalStorage.getItem<string>(SECONDARY_LANG_KEY)) || "fr";
  const fixText = (await LocalStorage.getItem<string>(FIX_TEXT_KEY)) === "true";

  log("Starting translation with preferences", {
    primaryLanguage,
    secondaryLanguage,
    fixText,
  });

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
      await showHUD("ℹ️ Please select some text to translate");
      return;
    }

    // Check cache
    const cacheKey = `${selectedText}_${primaryLanguage}_${secondaryLanguage}`;
    const cachedTranslation = translationCache.get(cacheKey);

    if (cachedTranslation) {
      log("Using cached translation");
      await replaceSelectedText(cachedTranslation);
      return;
    }

    // Show progress
    await showHUD("🌐 Translating...");

    // Create the translation prompt
    const prompt = `Translate this text between ${getLanguageName(primaryLanguage)} and ${getLanguageName(secondaryLanguage)}:
"${selectedText}"

Rules:
- First detect the source language between ${getLanguageName(primaryLanguage)}, ${getLanguageName(secondaryLanguage)}
- Translate to the other language
- If the source language is not ${getLanguageName(primaryLanguage)} or ${getLanguageName(secondaryLanguage)}, translate to ${getLanguageName(primaryLanguage)}
- Keep formatting and punctuation
- Preserve special characters and technical terms
- Match the original tone${fixText ? "\n- Fix any grammar, punctuation and spelling issues" : ""}

Respond ONLY with the translation, no explanations or language detection info.`;

    log("Translation prompt", { prompt });

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
