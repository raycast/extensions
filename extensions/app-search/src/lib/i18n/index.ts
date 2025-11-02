/**
 * i18n - Internationalization support
 */

import { getPreferenceValues } from "@raycast/api";
import { SupportedLanguage, I18nMessages } from "./types";
import { en } from "./translations/en";
import { ja } from "./translations/ja";

interface Preferences {
  language: SupportedLanguage;
}

const translations: Record<SupportedLanguage, I18nMessages> = {
  en,
  ja,
};

/**
 * Get the current language from preferences
 */
function getCurrentLanguage(): SupportedLanguage {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return preferences.language || "en";
  } catch {
    return "en";
  }
}

/**
 * Get the current translations
 */
export function useTranslations(): I18nMessages {
  const language = getCurrentLanguage();
  return translations[language];
}

/**
 * Get a specific translation by key
 */
export function t(key: keyof I18nMessages): I18nMessages[typeof key] {
  const messages = useTranslations();
  return messages[key];
}

// Export types
export type { SupportedLanguage, I18nMessages };
