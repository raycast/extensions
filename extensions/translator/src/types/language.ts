export type SupportedLanguage = "zh" | "ja" | "en";

export const LANGUAGE_OPTIONS = [
  { title: "Chinese", value: "zh" },
  { title: "Japanese", value: "ja" },
  { title: "English", value: "en" },
] as const;

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value === "zh" || value === "ja" || value === "en";
}

export function getLanguageLabel(language: SupportedLanguage): string {
  if (language === "zh") {
    return "Chinese";
  }

  if (language === "ja") {
    return "Japanese";
  }

  return "English";
}

export function getLanguageNativeName(language: SupportedLanguage): string {
  if (language === "zh") {
    return "简体中文";
  }

  if (language === "ja") {
    return "日本語";
  }

  return "English";
}
