export interface LanguageOption {
  code: string;
  label: string; // English name
  native: string; // Name in native language
}

export const LANGUAGE_MAP: Record<string, { label: string; native: string }> = {
  auto: { label: "Auto (detect)", native: "Auto (detect)" },
  en: { label: "English", native: "English" },
  zh: { label: "Chinese", native: "中文" },
  "zh-Hans": { label: "Simplified Chinese", native: "简体中文" },
  "zh-Hant": { label: "Traditional Chinese", native: "繁體中文" },
  yue: { label: "Cantonese", native: "粵語" },
  de: { label: "German", native: "Deutsch" },
  es: { label: "Spanish", native: "Español" },
  ru: { label: "Russian", native: "Русский" },
  ko: { label: "Korean", native: "한국어" },
  fr: { label: "French", native: "Français" },
  ja: { label: "Japanese", native: "日本語" },
  pt: { label: "Portuguese", native: "Português" },
  tr: { label: "Turkish", native: "Türkçe" },
  pl: { label: "Polish", native: "Polski" },
  ca: { label: "Catalan", native: "Català" },
  nl: { label: "Dutch", native: "Nederlands" },
  ar: { label: "Arabic", native: "العربية" },
  sv: { label: "Swedish", native: "Svenska" },
  it: { label: "Italian", native: "Italiano" },
  id: { label: "Indonesian", native: "Bahasa Indonesia" },
  hi: { label: "Hindi", native: "हिन्दी" },
  fi: { label: "Finnish", native: "Suomi" },
  vi: { label: "Vietnamese", native: "Tiếng Việt" },
  he: { label: "Hebrew", native: "עברית" },
  uk: { label: "Ukrainian", native: "Українська" },
  el: { label: "Greek", native: "Ελληνικά" },
  ms: { label: "Malay", native: "Bahasa Melayu" },
  cs: { label: "Czech", native: "Čeština" },
  ro: { label: "Romanian", native: "Română" },
  da: { label: "Danish", native: "Dansk" },
  hu: { label: "Hungarian", native: "Magyar" },
  ta: { label: "Tamil", native: "தமிழ்" },
  no: { label: "Norwegian", native: "Norsk" },
  th: { label: "Thai", native: "ภาษาไทย" },
  ur: { label: "Urdu", native: "اردو" },
  hr: { label: "Croatian", native: "Hrvatski" },
  bg: { label: "Bulgarian", native: "Български" },
  lt: { label: "Lithuanian", native: "Lietuvių" },
  la: { label: "Latin", native: "Latina" },
  mi: { label: "Maori", native: "Māori" },
  ml: { label: "Malayalam", native: "മലയാളം" },
  cy: { label: "Welsh", native: "Cymraeg" },
  sk: { label: "Slovak", native: "Slovenčina" },
  te: { label: "Telugu", native: "తెలుగు" },
  fa: { label: "Persian", native: "فارسی" },
  lv: { label: "Latvian", native: "Latviešu" },
  bn: { label: "Bengali", native: "বাংলা" },
  sr: { label: "Serbian", native: "Српски" },
  az: { label: "Azerbaijani", native: "Azərbaycan" },
  sl: { label: "Slovenian", native: "Slovenščina" },
  kn: { label: "Kannada", native: "ಕನ್ನಡ" },
  et: { label: "Estonian", native: "Eesti" },
  mk: { label: "Macedonian", native: "Македонски" },
  br: { label: "Breton", native: "Brezhoneg" },
  eu: { label: "Basque", native: "Euskara" },
  is: { label: "Icelandic", native: "Íslenska" },
  hy: { label: "Armenian", native: "Հայերեն" },
  ne: { label: "Nepali", native: "नेपाली" },
  mn: { label: "Mongolian", native: "Монгол" },
  bs: { label: "Bosnian", native: "Bosanski" },
  kk: { label: "Kazakh", native: "Қазақ" },
  sq: { label: "Albanian", native: "Shqip" },
  sw: { label: "Swahili", native: "Kiswahili" },
  gl: { label: "Galician", native: "Galego" },
  mr: { label: "Marathi", native: "मराठी" },
  pa: { label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  si: { label: "Sinhala", native: "සිංහල" },
  km: { label: "Khmer", native: "ខ្មែរ" },
  sn: { label: "Shona", native: "chiShona" },
  yo: { label: "Yoruba", native: "Yorùbá" },
  so: { label: "Somali", native: "Soomaali" },
  af: { label: "Afrikaans", native: "Afrikaans" },
  oc: { label: "Occitan", native: "Occitan" },
  ka: { label: "Georgian", native: "ქართული" },
  be: { label: "Belarusian", native: "Беларуская" },
  tg: { label: "Tajik", native: "Тоҷикӣ" },
  sd: { label: "Sindhi", native: "سنڌي" },
  gu: { label: "Gujarati", native: "ગુજરાતી" },
  am: { label: "Amharic", native: "አማርኛ" },
  yi: { label: "Yiddish", native: "ייִדיש" },
  lo: { label: "Lao", native: "ລາວ" },
  uz: { label: "Uzbek", native: "Oʻzbek" },
  fo: { label: "Faroese", native: "Føroyskt" },
  ht: { label: "Haitian Creole", native: "Kreyòl ayisyen" },
  ps: { label: "Pashto", native: "پښتو" },
  tk: { label: "Turkmen", native: "Türkmen" },
  nn: { label: "Nynorsk", native: "Nynorsk" },
  mt: { label: "Maltese", native: "Malti" },
  sa: { label: "Sanskrit", native: "संस्कृतम्" },
  lb: { label: "Luxembourgish", native: "Lëtzebuergesch" },
  my: { label: "Myanmar", native: "မြန်မာ" },
  bo: { label: "Tibetan", native: "བོད་སྐད།" },
  tl: { label: "Tagalog", native: "Filipino" },
  mg: { label: "Malagasy", native: "Malagasy" },
  as: { label: "Assamese", native: "অসমীয়া" },
  tt: { label: "Tatar", native: "Татар" },
  haw: { label: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  ln: { label: "Lingala", native: "Lingála" },
  ha: { label: "Hausa", native: "Hausa" },
  ba: { label: "Bashkir", native: "Башҡорт" },
  jw: { label: "Javanese", native: "Basa Jawa" },
  su: { label: "Sundanese", native: "Basa Sunda" },
};

// All non-auto entries as an ordered array (preserves map insertion order)
const ALL_LANGUAGES: LanguageOption[] = Object.entries(LANGUAGE_MAP)
  .filter(([code]) => code !== "auto")
  .map(([code, { label, native }]) => ({ code, label, native }));

const AUTO_OPTION: LanguageOption = {
  code: "auto",
  label: "Auto (detect)",
  native: "Auto (detect)",
};

/**
 * Returns languages available for a model.
 * - supportedLanguages === undefined → all Whisper languages
 * - supportedLanguages === []        → only auto (edge case)
 * - supportedLanguages === ["en", …] → filtered list
 * Always prepends the "auto" option.
 */
export function getLanguagesForModel(
  supportedLanguages?: string[],
): LanguageOption[] {
  const filtered = supportedLanguages
    ? ALL_LANGUAGES.filter(({ code }) => supportedLanguages.includes(code))
    : ALL_LANGUAGES;
  return [AUTO_OPTION, ...filtered];
}
