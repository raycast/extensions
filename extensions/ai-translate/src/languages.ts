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
] as const;

const languageTitleByValue = Object.fromEntries(LANGUAGE_CHOICES.map((item) => [item.value, item.title]));

export function getLanguageTitle(value: string): string {
  return languageTitleByValue[value] ?? value;
}

export function resolveTargetLanguage(preferredLanguage: string, text: string): string {
  if (preferredLanguage !== "auto") {
    return preferredLanguage;
  }

  return containsChinese(text) ? "en" : "zh-Hans";
}

function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
}
