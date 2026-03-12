import { getPreferenceValues } from "@raycast/api";

export interface Language {
  code: string;
  name: string;
}

export interface LanguagePair {
  source: Language;
  target: Language;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "uk", name: "Ukrainian" },
  { code: "ru", name: "Russian" },
  { code: "be", name: "Belarusian" },
  { code: "pl", name: "Polish" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "cs", name: "Czech" },
  { code: "sv", name: "Swedish" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "tr", name: "Turkish" },
];

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function storageKeyPrefix(pair: LanguagePair): string {
  return `${pair.source.code}-${pair.target.code}`;
}

export function getLanguagePair(): LanguagePair {
  const { sourceLanguage = "en", targetLanguage = "uk" } = getPreferenceValues<Preferences>();
  if (sourceLanguage === targetLanguage) {
    throw new Error("Source and target language must be different.");
  }
  const source = getLanguageByCode(sourceLanguage);
  const target = getLanguageByCode(targetLanguage);
  if (!source || !target) {
    throw new Error("Invalid language configuration in preferences.");
  }
  return { source, target };
}
