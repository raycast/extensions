import { fold } from "./text";

/**
 * `value` is the English name sent to the model and shown in the UI; `native` and `code`
 * (ISO 639-1) are extra ways to find a language, e.g. in a ">de" suffix.
 */
export interface Language {
  value: string;
  native: string;
  code: string;
}

export const LANGUAGES: Language[] = [
  { value: "English", native: "English", code: "en" },
  { value: "Spanish", native: "Español", code: "es" },
  { value: "French", native: "Français", code: "fr" },
  { value: "German", native: "Deutsch", code: "de" },
  { value: "Italian", native: "Italiano", code: "it" },
  { value: "Portuguese", native: "Português", code: "pt" },
  { value: "Dutch", native: "Nederlands", code: "nl" },
  { value: "Turkish", native: "Türkçe", code: "tr" },
  { value: "Russian", native: "Русский", code: "ru" },
  { value: "Ukrainian", native: "Українська", code: "uk" },
  { value: "Polish", native: "Polski", code: "pl" },
  { value: "Czech", native: "Čeština", code: "cs" },
  { value: "Greek", native: "Ελληνικά", code: "el" },
  { value: "Romanian", native: "Română", code: "ro" },
  { value: "Hungarian", native: "Magyar", code: "hu" },
  { value: "Bulgarian", native: "Български", code: "bg" },
  { value: "Swedish", native: "Svenska", code: "sv" },
  { value: "Norwegian", native: "Norsk", code: "no" },
  { value: "Danish", native: "Dansk", code: "da" },
  { value: "Finnish", native: "Suomi", code: "fi" },
  { value: "Arabic", native: "العربية", code: "ar" },
  { value: "Hebrew", native: "עברית", code: "he" },
  { value: "Persian", native: "فارسی", code: "fa" },
  { value: "Azerbaijani", native: "Azərbaycanca", code: "az" },
  { value: "Kazakh", native: "Қазақша", code: "kk" },
  { value: "Georgian", native: "ქართული", code: "ka" },
  { value: "Hindi", native: "हिन्दी", code: "hi" },
  { value: "Indonesian", native: "Bahasa Indonesia", code: "id" },
  { value: "Vietnamese", native: "Tiếng Việt", code: "vi" },
  { value: "Thai", native: "ไทย", code: "th" },
  { value: "Japanese", native: "日本語", code: "ja" },
  { value: "Korean", native: "한국어", code: "ko" },
  { value: "Chinese (Simplified)", native: "简体中文", code: "zh" },
  { value: "Chinese (Traditional)", native: "繁體中文", code: "zh-tw" },
];

export const AUTO = "auto";

export function findLanguage(valueOrCode: string | undefined | null): Language | undefined {
  if (!valueOrCode) return undefined;
  const key = fold(valueOrCode);
  return LANGUAGES.find((l) => [l.value, l.code, l.native].some((name) => fold(name) === key));
}

/**
 * A trailing "> de" / ">german" picks the target language for one lookup, e.g. "hello >ja".
 * Returns the text without the suffix and the language, or null when there is no valid suffix.
 */
export function parseTargetSuffix(input: string): { text: string; language: Language } | null {
  const match = input.match(/^([\s\S]*?)\s*>\s*([\p{L} ()-]{2,25})\s*$/u);
  if (!match || !match[1].trim()) return null;
  const language = findLanguage(match[2]);
  return language ? { text: match[1], language } : null;
}

/** Display name for a language value or ISO code; unknown values pass through. */
export function languageTitle(valueOrCode: string | undefined | null): string {
  if (!valueOrCode) return "";
  return findLanguage(valueOrCode)?.value ?? valueOrCode;
}

export function languageCode(valueOrCode: string | undefined | null): string | undefined {
  return (
    findLanguage(valueOrCode)?.code ??
    (valueOrCode && /^[a-z]{2}$/i.test(valueOrCode) ? valueOrCode.toLowerCase() : undefined)
  );
}
