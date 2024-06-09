export type UnDocument = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
};

export type UnNews = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  image: string;
  source: string;
};

export type UnPress = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  creator: string;
};

export enum LanguageCode {
  Arabic = "ar",
  Chinese = "zh",
  English = "en",
  French = "fr",
  Russian = "ru",
  Spanish = "es",
  Portuguese = "pt",
  Swahili = "sw",
  Hindi = "hi",
  Urdu = "ur",
}

export type LanguageName = keyof typeof LanguageCode;

export type NewsAll = "all";

export enum NewsRegion {
  MiddleEast = "middleEast",
  Africa = "africa",
  Europe = "europe",
  Americas = "americas",
  AsiaPacific = "asiaPacific",
}

export enum NewsTopic {
  Heath = "health",
  UnAffaris = "unAffairs",
  LawAndCrimePrevention = "lawAndCrimePrevention",
  HumanRights = "humanRights",
  HumanitarianAid = "humanitarianAid",
  ClimateChange = "climateChange",
  ClutureAndEducation = "clutureAndEducation",
  EconomicDevelopment = "economicDevelopment",
  Women = "women",
  PeaceAndSecurity = "peaceAndSecurity",
  MigrantsAndRefugees = "migrantsAndRefugees",
  SDGs = "sdgs",
}

export type NewsType = NewsAll | NewsRegion | NewsTopic;

export type Internationalization = {
  languageName: string;
  searchBarPlaceholder: string;
  viewSummary: string;
  externalExtensionRequired: {
    title: string;
    message: string;
  };
  selectNewsType: string;
  viewByRegion: string;
  viewByTopic: string;
  newsType: Record<NewsAll | NewsRegion | NewsTopic, string>;
};
