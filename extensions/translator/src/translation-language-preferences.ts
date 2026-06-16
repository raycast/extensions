const LANGUAGE_PREFERENCE_KEYS = [
  "showSpanish",
  "showEnglish",
  "showBrazilianPortuguese",
  "showFrench",
  "showGerman",
  "showItalian",
  "showJapanese",
  "showKorean",
  "showSimplifiedChinese",
] as const satisfies ReadonlyArray<keyof Preferences>;

export type TranslationLanguagePreference = (typeof LANGUAGE_PREFERENCE_KEYS)[number];
export type TranslationLanguagePreferences = Pick<Preferences, TranslationLanguagePreference>;

export function enabledLanguagePreferences(
  preferences: TranslationLanguagePreferences,
): TranslationLanguagePreference[] {
  return LANGUAGE_PREFERENCE_KEYS.filter((preference) => preferences[preference]);
}
