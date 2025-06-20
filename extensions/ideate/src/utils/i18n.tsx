import { getPreferenceValues } from "@raycast/api";
import { translations, Translation } from "../i18n";

interface Preferences {
  language: string;
}

export function useTranslation(): { t: Translation; language: string } {
  const preferences = getPreferenceValues<Preferences>();
  const language = preferences.language || "en";

  // If the specified language doesn't exist, use English as the default language
  const t = translations[language] || translations["en"];

  return { t, language };
}
