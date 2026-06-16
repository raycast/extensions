export interface TranslationLanguagePreferences {
  showSpanish: boolean;
  showEnglish: boolean;
  showBrazilianPortuguese: boolean;
  showFrench: boolean;
  showGerman: boolean;
  showItalian: boolean;
  showJapanese: boolean;
  showKorean: boolean;
  showSimplifiedChinese: boolean;
}

const LANGUAGE_PREFERENCE_KEYS: Array<keyof TranslationLanguagePreferences> = [
  "showSpanish",
  "showEnglish",
  "showBrazilianPortuguese",
  "showFrench",
  "showGerman",
  "showItalian",
  "showJapanese",
  "showKorean",
  "showSimplifiedChinese",
];

export function enabledLanguagePreferences(
  preferences: TranslationLanguagePreferences,
): Array<keyof TranslationLanguagePreferences> {
  return LANGUAGE_PREFERENCE_KEYS.filter((preference) => preferences[preference]);
}
