import { showToast, Toast, LocalStorage } from "@raycast/api";
import langMapper from "./languageMap";
import { createMapping } from "./languageMap";

export interface LanguageFormValues {
  firstLang: string;
  secondLang: string;
}

export async function saveSetting(lang: LanguageFormValues) {
  await LocalStorage.setItem("firstLang", lang.firstLang);
  await LocalStorage.setItem("secondLang", lang.secondLang);
}

export async function getSetting(): Promise<LanguageFormValues> {
  const firstLang = await LocalStorage.getItem<string>("firstLang");
  const secondLang = await LocalStorage.getItem<string>("secondLang");
  return { firstLang: firstLang || "en", secondLang: secondLang || "th" };
}

export function showToastError(errorText: string) {
  showToast({
    style: Toast.Style.Failure,
    title: "Booom 💥",
    message: errorText,
  });
}

export function detectPredominantLanguage(text: string): string {
  // Define regex patterns for Thai and English characters
  const thaiPattern = /[\u0E00-\u0E7F]/g;
  const englishPattern = /[a-zA-Z]/g;

  // Match the characters and count them
  const thaiMatches = text.match(thaiPattern) || [];
  const englishMatches = text.match(englishPattern) || [];

  // Determine the predominant language
  if (thaiMatches.length > englishMatches.length) {
    return "th"; // Thai
  } else if (englishMatches.length > thaiMatches.length) {
    return "en"; // English
  } else {
    return "mixed"; // Equal or no matches
  }
}

export function getKeyboardLayoutMapperByText(text: string): Record<string, string> {
  // const lang = text.match(/[\u0E00-\u0E7F]/) ? "th" : "en";
  let lang = detectPredominantLanguage(text);
  if (lang === "mixed") {
    lang = "en";
  }
  const mapping = createMapping(langMapper[lang === "th" ? "en" : "th"], langMapper[lang]);
  return mapping;
}

export function switchLanguage(text: string): string {
  const mapper = getKeyboardLayoutMapperByText(text);
  return text
    .split("")
    .map((char) => mapper[char] || char)
    .join("");
}
