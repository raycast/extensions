/**
 * Types for Quranic verses and Hadith on Sadaqah
 */

export interface Translation {
  en: string;
  [key: string]: string;
}

export interface Ayah {
  id: string;
  surah: string;
  verse: string;
  arabic: string;
  translation: Translation;
}

export interface Hadith {
  id: string;
  number: number;
  arabic: string;
  translation: Translation;
  source: string;
}

export interface Quotes {
  ayahs: Ayah[];
  hadiths: Hadith[];
}

export type QuoteType = "ayah" | "hadith" | "any";

export interface QuoteResult {
  type: "ayah" | "hadith";
  data: Ayah | Hadith;
}

/**
 * Get translation for a specific language
 * Falls back to English if the requested language is not available
 */
export function getTranslation(translation: Translation, lang: string = "en"): string {
  return translation[lang] || translation.en || "";
}
