/**
 * Translation utility for SonarQube Tools extension
 *
 * Provides English-only translation functionality as per Raycast Store guidelines
 */

import { en } from "./translations/index";

// English only as per Raycast guidelines
export type Language = "en";

// Translation dictionary (English only)
const translations = {
  en,
};

// Always return English as per Raycast guidelines
export function getLanguage(): Language {
  return "en";
}

/**
 * Translate a key to the current language
 *
 * @param key The translation key to lookup
 * @param params Optional parameters to substitute in the translation
 * @returns The translated string or the key if translation not found
 */
export function t(key: string, params?: Record<string, string>): string {
  const lang = getLanguage();
  let translated = key;

  try {
    // Get the translation from the dictionary
    const translationObj = translations[lang];
    const keyParts = key.split(".");

    // Navigate the nested translation object
    let current: Record<string, unknown> = translationObj as Record<string, unknown>;
    for (const part of keyParts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part] as Record<string, unknown>;
      } else {
        // Key not found in this language
        current = null as unknown as Record<string, unknown>;
        break;
      }
    }

    if (current && typeof current === "string") {
      translated = current;

      // Replace any parameters
      if (params) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(params).forEach(([key, value]) => {
          translated = translated.replace(new RegExp(`{{${key}}}`, "g"), value);
        });
      }
    } else if (lang !== "en") {
      // Try English as fallback if not already using it
      const enTranslation = translations.en;
      let fallback: Record<string, unknown> = enTranslation as Record<string, unknown>;

      for (const part of keyParts) {
        if (fallback && typeof fallback === "object" && part in fallback) {
          fallback = fallback[part] as Record<string, unknown>;
        } else {
          fallback = null as unknown as Record<string, unknown>;
          break;
        }
      }

      if (fallback && typeof fallback === "string") {
        translated = fallback;

        // Replace any parameters in the fallback
        if (params) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(params).forEach(([key, value]) => {
            translated = translated.replace(new RegExp(`{{${key}}}`, "g"), value);
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error translating key: ${key}`, error);
  }

  return translated;
}

// Shorthand alias - use the same reference to the function, not just the same functionality
export const __ = t;

// Create a simple object with all our functions
const i18n = {
  t,
  __,
  getLanguage,
};

// Export directly for simplicity in module compatibility
export default i18n;
