export type SystemLanguage = {
  value: string;
  title: string;
};

export const DEFAULT_LANGUAGE = "English (US)";

export const SYSTEM_LANGUAGES: SystemLanguage[] = [
  { value: DEFAULT_LANGUAGE, title: DEFAULT_LANGUAGE },
  { value: "English (UK)", title: "English (UK)" },
  { value: "Simplified Chinese", title: "简体中文" },
  { value: "Traditional Chinese", title: "繁體中文" },
  {
    value: "Traditional Chinese (Hong Kong)",
    title: "繁體中文（香港）",
  },
  { value: "Japanese", title: "日本語" },
  { value: "Korean", title: "한국어" },
  { value: "French", title: "Français" },
  { value: "German", title: "Deutsch" },
  { value: "Spanish", title: "Español" },
  { value: "Italian", title: "Italiano" },
  { value: "Portuguese", title: "Português" },
  { value: "Russian", title: "Русский" },
  { value: "Vietnamese", title: "Tiếng Việt" },
  { value: "Thai", title: "ภาษาไทย" },
  { value: "Indonesian", title: "Bahasa Indonesia" },
  { value: "Malay", title: "Bahasa Melayu" },
  { value: "Filipino", title: "Filipino" },
  { value: "Turkish", title: "Türkçe" },
  { value: "Dutch", title: "Nederlands" },
  { value: "Polish", title: "Polski" },
  { value: "Swedish", title: "Svenska" },
  { value: "Danish", title: "Dansk" },
  { value: "Norwegian", title: "Norsk" },
  { value: "Finnish", title: "Suomi" },
  { value: "Greek", title: "Ελληνικά" },
  { value: "Czech", title: "Čeština" },
  { value: "Hungarian", title: "Magyar" },
  { value: "Romanian", title: "Română" },
  { value: "Ukrainian", title: "Українська" },
  { value: "Hebrew", title: "עברית" },
  { value: "Arabic", title: "العربية" },
  { value: "Hindi", title: "हिन्दी" },
  { value: "Bengali", title: "বাংলা" },
  { value: "Telugu", title: "తెలుగు" },
  { value: "Marathi", title: "मराठी" },
  { value: "Tamil", title: "தமிழ்" },
  { value: "Gujarati", title: "ગુજરાતી" },
  { value: "Kannada", title: "ಕನ್ನಡ" },
  { value: "Malayalam", title: "മലയാളം" },
  { value: "Punjabi", title: "ਪੰਜਾਬੀ" },
];

const languageMap = new Map(SYSTEM_LANGUAGES.map((language) => [language.value, language] as const));

export function normalizeStoredLanguageValue(value: string): string {
  if (!value) return value;
  if (languageMap.has(value)) return value;

  const englishPart = value.includes(" - ") ? value.split(" - ").pop()?.trim() || value : value.trim();

  if (languageMap.has(englishPart)) {
    return englishPart;
  }

  switch (englishPart) {
    case "Chinese, Simplified":
      return "Simplified Chinese";
    case "Chinese, Traditional":
      return "Traditional Chinese";
    case "Chinese, Traditional (Hong Kong)":
      return "Traditional Chinese (Hong Kong)";
    default:
      return value;
  }
}

export function getLanguagePromptLabel(value: string): string {
  const normalized = normalizeStoredLanguageValue(value);
  return languageMap.get(normalized)?.title || normalized;
}

export function getLanguageDisplayLabel(language: SystemLanguage): string {
  return language.title === language.value ? language.title : `${language.title} (${language.value})`;
}
