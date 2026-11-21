import { getPreferenceValues } from "@raycast/api";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  ru: "Russian",
  uk: "Ukrainian",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
};

/** Language code chosen in preferences. */
export function getLanguage(): string {
  const { language } = getPreferenceValues<Preferences>();
  return language && LANGUAGE_NAMES[language] ? language : "en";
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? "English";
}
