import _supportedLanguagesByCode from "./supportedLanguagesByCode.json";
import _supportedLanguagesByCountry from "./supportedLanguages.json";

export type LanguagesMapByCountry = typeof _supportedLanguagesByCountry;
export type LanguageCountries = keyof LanguagesMapByCountry;

export type LanguagesMapByCode = typeof _supportedLanguagesByCode;
export type LanguageCode = keyof LanguagesMapByCode;

export type LanguagesItem = {
  code: LanguageCode;
  name: string;
  flag?: string;
};

export const getLanguageFlag = (language?: LanguagesItem, fallback = "🏳️") => {
  return language?.flag ?? fallback;
};

export const supportedLanguagesByCode = _supportedLanguagesByCode as Record<LanguageCode, LanguagesItem>;
export const supportedLanguagesByCountry = _supportedLanguagesByCountry as Record<LanguageCountries, LanguagesItem>;

export const languages: LanguagesItem[] = Object.values(supportedLanguagesByCountry);
