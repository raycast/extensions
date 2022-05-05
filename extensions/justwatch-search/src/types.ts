export interface Preferences {
  country_code: string;
}

export enum MediaType {
  stream = "flatrate",
  buy = "buy",
  rent = "rent",
  free = "free",
}

export interface JustWatchMedia {
  id: number;
  name: string;
  type: string;
  year: number;
  thumbnail: string;
  jw_url: string;
  offers: JustWatchMediaOffers[];
}

export interface JustWatchMediaOffers {
  type: MediaType;
  service: string;
  url: string;
  icon: string;
  name: string;
  seasons: string;
  price_amount: number;
  price: string;
}

export interface MediaProvider {
  icon_url: string;
  short_name: string;
  clear_name: string;
}

export enum Country {
  "" = "",
  en_US = "United States",
  de_DE = "Germany",
  pt_BR = "Brazil",
  en_AU = "Australia",
  en_NZ = "New Zealand",
  en_CA = "Canada",
  en_GB = "United Kingdom",
  en_ZA = "South Africa",
  en_IE = "Ireland",
  fr_CI = "Ivory Coast",
  es_EC = "Ecuador",
  es_BO = "Bolivia",
  es_ES = "Spain",
  lv_LV = "Latvia",
  es_CR = "Costa Rica",
  lt_LT = "Lithuania",
  en_GH = "Ghana",
  zh_TW = "Taiwan",
  ar_EG = "Egypt",
  es_GQ = "Equatorial Guinea",
  fr_FR = "France",
  ko_KR = "South Korea",
  it_IT = "Italy",
  ur_PK = "Pakistan",
  fr_NE = "Niger",
  en_NG = "Nigeria",
  es_MX = "Mexico",
  ja_JP = "Japan",
  en_NL = "Netherlands",
  es_GT = "Guatemala",
  pt_MZ = "Mozambique",
  en_KE = "Kenya",
  fr_BE = "Belgium",
  es_PE = "Peru",
  ar_SA = "Saudi Arabia",
  en_TH = "Thailand",
  en_UG = "Uganda",
  zh_HK = "Hong Kong",
  sk_SK = "Slovakia",
  bg_BG = "Bulgaria",
  pt_PT = "Portugal",
  cs_CZ = "Czech Republic",
  ru_RU = "Russia",
  en_IN = "India",
  de_CH = "Switzerland",
  de_AT = "Austria",
  en_MY = "Malaysia",
  en_ID = "Indonesia",
  es_HN = "Honduras",
  en_SG = "Singapore",
  pl_PL = "Poland",
  fi_FI = "Finland",
  hu_HU = "Hungary",
  el_GR = "Greece",
  tr_TR = "Turkey",
  es_CO = "Colombia",
  es_VE = "Venezuela",
  en_PH = "Philippines",
  et_EE = "Estonia",
  es_PY = "Paraguay",
  ar_AE = "United Arab Emirates",
  is_IS = "Iceland",
  en_ZM = "Zambia",
  fr_SN = "Senegal",
  sv_SE = "Sweden",
  ro_RO = "Romania",
  en_JM = "Jamaica",
  ro_MD = "Moldova",
  es_PA = "Panama",
  es_UY = "Uruguay",
  es_DO = "Dominican Republic",
  es_SV = "El Salvador",
  de_LI = "Liechtenstein",
  fr_MC = "Monaco",
  it_SM = "San Marino",
  en_GI = "Gibraltar",
  ar_TN = "Tunisia",
  ar_DZ = "Algeria",
  ar_MA = "Morocco",
  ar_LY = "Libya",
  ar_KW = "Kuwait",
  en_NO = "Norway",
  ar_OM = "Oman",
  ar_QA = "Qatar",
  en_BB = "Barbados",
  en_BM = "Bermuda",
  ar_YE = "Yemen",
  en_BS = "Bahamas",
  fr_GF = "French Guiana",
  ar_BH = "Bahrain",
  hr_HR = "Croatia",
  ar_JO = "Jordan",
  en_DK = "Denmark",
  es_AR = "Argentina",
  es_CL = "Chile",
}
