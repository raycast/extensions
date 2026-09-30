import { LanguageCode, NewsType } from "./types.js";

export const languageCodes = Object.values(LanguageCode);
export const languageNames = Object.keys(LanguageCode);
export const newsFeedUrlDict: Record<NewsType, string> = {
  all: "all",
  middleEast: "region/middle-east/feed",
  africa: "region/africa/feed",
  europe: "region/europe/feed",
  americas: "region/americas/feed",
  asiaPacific: "region/asia-pacific/feed",
  health: "topic/health/feed",
  unAffairs: "topic/un-affairs/feed",
  lawAndCrimePrevention: "topic/law-and-crime-prevention/feed",
  humanRights: "topic/human-rights/feed",
  humanitarianAid: "topic/humanitarian-aid/feed",
  climateChange: "topic/climate-change/feed",
  clutureAndEducation: "topic/culture-and-education/feed",
  economicDevelopment: "topic/economic-development/feed",
  women: "topic/women/feed",
  peaceAndSecurity: "topic/peace-and-security/feed",
  migrantsAndRefugees: "topic/migrants-and-refugees/feed",
  sdgs: "topic/sdgs/feed",
};
export const recommendVoices: Record<LanguageCode, string[]> = {
  ar: ["Majed"],
  zh: ["Tingting"],
  en: ["Samantha"],
  fr: ["Thomas"],
  ru: ["Milena"],
  es: ["Mónica"],
  pt: ["Joana"],
  sw: [],
  hi: ["Lekha"],
  ur: [],
};
