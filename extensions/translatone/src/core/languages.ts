export interface Language {
  readonly code: string;
  readonly name: string;
}

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "zh-Hans", name: "Chinese (Simplified)" },
  { code: "zh-Hant", name: "Chinese (Traditional)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
] as const satisfies readonly Language[];

export const DEFAULT_LANGUAGE: Language = LANGUAGES[0];

export function resolveLanguage(code: string | undefined, fallback: Language): Language {
  return LANGUAGES.find((language) => language.code === code) ?? fallback;
}
