export const TARGET_LANGUAGES = [
  "English",
  "Japanese",
  "Chinese (Simplified)",
  "Korean",
  "Spanish",
  "French",
  "German",
] as const;

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

export function isTargetLanguage(value: string): value is TargetLanguage {
  return TARGET_LANGUAGES.some((language) => language === value);
}
