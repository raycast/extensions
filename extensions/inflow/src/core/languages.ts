export type SystemLanguage = {
  value: string;
  title: string;
};

export const SYSTEM_LANGUAGES: SystemLanguage[] = [
  { value: "English (US)", title: "English (US)" },
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

const languageMap = new Map(
  SYSTEM_LANGUAGES.map((language) => [language.value, language] as const),
);

/**
 * Gets the default language based on the environment locale.
 * Maps BCP-47 tags or locale strings to the closest match in SYSTEM_LANGUAGES.
 */
export function getDefaultLanguageFromEnv(envLang: string): string {
  const normalized = envLang.toLowerCase().replace("_", "-");

  if (normalized.startsWith("zh-hans") || normalized === "zh-cn")
    return "Simplified Chinese";
  if (normalized.startsWith("zh-hant-hk") || normalized === "zh-hk")
    return "Traditional Chinese (Hong Kong)";
  if (normalized.startsWith("zh-hant") || normalized.startsWith("zh-tw"))
    return "Traditional Chinese";

  if (normalized.startsWith("ja")) return "Japanese";
  if (normalized.startsWith("ko")) return "Korean";
  if (normalized.startsWith("fr")) return "French";
  if (normalized.startsWith("de")) return "German";
  if (normalized.startsWith("es")) return "Spanish";
  if (normalized.startsWith("it")) return "Italian";
  if (normalized.startsWith("ru")) return "Russian";
  if (normalized.startsWith("pt")) return "Portuguese";
  if (normalized.startsWith("vi")) return "Vietnamese";
  if (normalized.startsWith("th")) return "Thai";
  if (normalized.startsWith("id")) return "Indonesian";
  if (normalized.startsWith("ms")) return "Malay";
  if (normalized.startsWith("fil")) return "Filipino";
  if (normalized.startsWith("tr")) return "Turkish";
  if (normalized.startsWith("nl")) return "Dutch";
  if (normalized.startsWith("pl")) return "Polish";
  if (normalized.startsWith("sv")) return "Swedish";
  if (normalized.startsWith("da")) return "Danish";
  if (normalized.startsWith("nb") || normalized.startsWith("no"))
    return "Norwegian";
  if (normalized.startsWith("fi")) return "Finnish";
  if (normalized.startsWith("el")) return "Greek";
  if (normalized.startsWith("cs")) return "Czech";
  if (normalized.startsWith("hu")) return "Hungarian";
  if (normalized.startsWith("ro")) return "Romanian";
  if (normalized.startsWith("uk")) return "Ukrainian";
  if (normalized.startsWith("he")) return "Hebrew";
  if (normalized.startsWith("ar")) return "Arabic";
  if (normalized.startsWith("hi")) return "Hindi";
  if (normalized.startsWith("bn")) return "Bengali";

  if (
    normalized === "en-gb" ||
    normalized === "en-au" ||
    normalized === "en-ca"
  )
    return "English (UK)";

  return "English (US)";
}

export function normalizeStoredLanguageValue(value: string): string {
  if (!value) return value;
  if (languageMap.has(value)) return value;

  const englishPart = value.includes(" - ")
    ? value.split(" - ").pop()?.trim() || value
    : value.trim();

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
  return language.title === language.value
    ? language.title
    : `${language.title} (${language.value})`;
}
