export enum MediaType {
  stream = "flatrate",
  buy = "buy",
  rent = "rent",
  free = "free",
}

export interface JustWatchMedia {
  id: string;
  name: string;
  type: string;
  year: number;
  thumbnail: string;
  backdrop: string;
  jwUrl: string;
  offers: JustWatchMediaOffers[];
  isMovie: boolean;
  imdbUrl: string;
  imdbScore: number;
  imdbVotes: number;
}

export interface JustWatchMediaOffers {
  type: MediaType;
  type_parsed: string;
  service: string;
  url: string;
  icon: string;
  name: string;
  seasons: string;
  priceAmount: number;
  priceString: string;
  presentationType: string;
  currency: string;
  otherPrices?: OtherPrices[];
}

export interface OtherPrices {
  priceAmount: number;
  presentationType: string;
  currency: string;
  seasons: string;
}

export enum Country {
  en_US = "United States",
  de_DE = "Germany",
  pt_BR = "Brazil",
  en_AU = "Australia",
  en_NZ = "New Zealand",
  en_CA = "Canada",
  en_GB = "United Kingdom",
  en_ZA = "South Africa",
  en_IE = "Ireland",
  es_MX = "Mexico",
  ja_JP = "Japan",
  en_NL = "Netherlands",
  en_LT = "Lithuania",
  fr_BE = "Belgium",
  es_PE = "Peru",
  en_SE = "Sweden",
  en_TH = "Thailand",
  pt_PT = "Portugal",
  cs_CZ = "Czech Republic",
  en_NO = "Norway",
  ru_RU = "Russia",
  en_EE = "Estonia",
  en_LV = "Latvia",
  zh_HK = "Hong Kong",
  zh_TW = "Taiwan",
  bg_BG = "Bulgaria",
  es_HN = "Honduras",
  is_IS = "Iceland",
  sk_SK = "Slovakia",
  hr_HR = "Croatia",
  ar_DZ = "Algeria",
  en_AG = "Antigua and Barbuda",
  en_BS = "Bahamas",
  ar_BH = "Bahrain",
  en_BB = "Barbados",
  en_BM = "Bermuda",
  pt_CV = "Cape Verde",
  es_CU = "Cuba",
  es_DO = "Dominican Republic",
  es_SV = "El Salvador",
  es_GQ = "Equatorial Guinea",
  en_FJ = "Fiji",
  fr_GF = "French Guiana",
  fr_PF = "French Polynesia",
  en_GH = "Ghana",
  en_GI = "Gibraltar",
  en_GG = "Guernsey",
  fr_CI = "Ivory Coast",
  en_JM = "Jamaica",
  ar_JO = "Jordan",
  en_KE = "Kenya",
  ar_KW = "Kuwait",
  ar_LY = "Libya",
  de_LI = "Liechtenstein",
  sq_AL = "Albania",
  ca_AD = "Andorra",
  bs_BA = "Bosnia and Herzegovina",
  ar_IQ = "Iraq",
  he_IL = "Israel",
  sq_XK = "Kosovo",
  en_IN = "India",
  de_CH = "Switzerland",
  de_AT = "Austria",
  en_MY = "Malaysia",
  en_ID = "Indonesia",
  en_PH = "Philippines",
  en_SG = "Singapore",
  pl_PL = "Poland",
  fi_FI = "Finland",
  hu_HU = "Hungary",
  el_GR = "Greece",
  tr_TR = "Turkey",
  es_CO = "Colombia",
  es_VE = "Venezuela",
  en_DK = "Denmark",
  ro_RO = "Romania",
  es_AR = "Argentina",
  es_CL = "Chile",
  es_EC = "Ecuador",
  es_ES = "Spain",
  fr_FR = "France",
  ko_KR = "South Korea",
  it_IT = "Italy",
  es_CR = "Costa Rica",
  es_GT = "Guatemala",
  es_BO = "Bolivia",
  es_PY = "Paraguay",
  ar_AE = "United Arab Emirates",
  ar_SA = "Saudi Arabia",
  ar_EG = "Egypt",
  fr_MU = "Mauritius",
  ro_MD = "Moldova",
  fr_MC = "Monaco",
  ar_MA = "Morocco",
  pt_MZ = "Mozambique",
  fr_NE = "Niger",
  en_NG = "Nigeria",
  ar_OM = "Oman",
  ur_PK = "Pakistan",
  es_PA = "Panama",
  ar_QA = "Qatar",
  fr_SC = "Saint Lucia",
  it_SM = "San Marino",
  fr_SN = "Senegal",
  sw_TZ = "Tanzania",
  en_TT = "Trinidad and Tobago",
  ar_TN = "Tunisia",
  en_TC = "Turks and Caicos Islands",
  en_UG = "Uganda",
  es_UY = "Uruguay",
  ar_YE = "Yemen",
  en_ZM = "Zambia",
  ar_LB = "Lebanon",
  mk_MK = "Macedonia",
  mt_MT = "Malta",
  ar_PS = "Palestine",
  sr_RS = "Serbia",
  sl_SI = "Slovenia",
  it_VA = "Vatican City",
}

export type Node = {
  id: string;
  objectType: string;
  objectId: number;
  content: {
    fullPath: string;
    title: string;
    originalReleaseYear: number;
    posterUrl: string;
    externalIds: {
      imdbId: string;
    };
    scoring: {
      imdbScore: number;
      imdbVotes: number;
      tmdbPopularity: number;
      tmdbScore: number;
    };
  };
  offerCount: number;
  offers: Array<{
    monetizationType: string;
    deeplinkURL: string;
    standardWebURL: string;
    elementCount: number;
    retailPriceValue?: number;
    retailPrice?: string;
    currency: string;
    presentationType: string;
    package: {
      id: string;
      packageId: string;
      clearName: string;
      icon: string;
    };
  }>;
};
