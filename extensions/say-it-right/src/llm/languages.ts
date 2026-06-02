export const LANGUAGE_CHOICES = [
  { title: "Auto", value: "auto" },
  { title: "Chinese Simplified", value: "zh-Hans" },
  { title: "Chinese Traditional", value: "zh-Hant" },
  { title: "English", value: "en" },
  { title: "Japanese", value: "ja" },
  { title: "Korean", value: "ko" },
  { title: "French", value: "fr" },
  { title: "German", value: "de" },
  { title: "Spanish", value: "es" },
  { title: "Italian", value: "it" },
  { title: "Portuguese", value: "pt" },
  { title: "Russian", value: "ru" },
  { title: "Arabic", value: "ar" },
  { title: "Hindi", value: "hi" },
  { title: "Vietnamese", value: "vi" },
  { title: "Thai", value: "th" },
  { title: "Indonesian", value: "id" },
  { title: "Turkish", value: "tr" },
  { title: "Dutch", value: "nl" },
  { title: "Polish", value: "pl" },
] as const;

const languageTitleByValue = Object.fromEntries(
  LANGUAGE_CHOICES.map((item) => [item.value, item.title]),
);

export function getLanguageTitle(value: string): string {
  return languageTitleByValue[value] ?? value;
}

export function resolveTargetLanguage(
  preferredLanguage: string | undefined,
  text: string,
): string {
  const preferred = preferredLanguage || "auto";
  if (preferred !== "auto") return preferred;
  return looksLikeChinese(text) ? "en" : "zh-Hans";
}

function looksLikeChinese(text: string): boolean {
  if (containsJapaneseKana(text) || containsHangul(text)) return false;
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
}

function containsJapaneseKana(text: string): boolean {
  return /[\u3040-\u30ff]/.test(text);
}

function containsHangul(text: string): boolean {
  return /[\uac00-\ud7a3]/.test(text);
}
