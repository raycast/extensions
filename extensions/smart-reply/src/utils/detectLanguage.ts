import { franc } from "franc-min";
import { LANGUAGES } from "../constants";
import type { Language } from "../types";

const languageCodeMap: Record<string, Language> = {
  jpn: "ja",
  eng: "en",
  fra: "fr",
  spa: "es",
  deu: "de",
  ita: "it",
  cmn: "zh",
  zho: "zh",
  kor: "ko",
  por: "pt",
  rus: "ru",
  nld: "nl",
  vie: "vi",
  tha: "th",
  ind: "id",
  hin: "hi",
  ara: "ar",
  ben: "bn",
  tur: "tr",
  ukr: "uk",
  pol: "pl",
  heb: "he",
  swe: "sv",
  dan: "da",
  fin: "fi",
};

export function detectLanguage(text: string): string {
  const detectedCode = franc(text);
  if (detectedCode === "und") {
    return "en";
  }

  const languageCode = languageCodeMap[detectedCode];

  if (languageCode && LANGUAGES[languageCode]) {
    return languageCode;
  }

  return "en";
}
