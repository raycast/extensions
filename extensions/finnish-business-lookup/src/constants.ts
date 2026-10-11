import type { TranslationKey } from "./lib/translations";

export const PRH_API_BASE_URL = "https://avoindata.prh.fi/opendata-ytj-api/v3";

export const YTJ_SEARCH_URL = "https://www.ytj.fi/en/index/company-search";
export const YTJ_SEARCH_URL_FI = "https://www.ytj.fi/index/yrityshaku.html";

export const MIN_TEXT_QUERY_LENGTH = 3;

export const FULL_BUSINESS_ID_REGEX = /^\d{7}-\d$/;
export const EIGHT_DIGIT_BUSINESS_ID_REGEX = /^\d{8}$/;
export const DIGITS_ONLY_REGEX = /^\d+$/;

// Reserved for backward compatibility with older local data.
export const FAVORITES_STORAGE_KEY = "prh-favorites-v1";

export const BUSINESS_ID_STATUS_LABELS: Record<string, TranslationKey> = {
  "1": "pending",
  "2": "valid",
  "5": "invalidated",
};

export const TRADE_REGISTER_STATUS_LABELS: Record<string, TranslationKey> = {
  "0": "unregistered",
  "1": "registered",
  "2": "removed",
  "3": "startupUnregistered",
  "4": "ceased",
};

export const REGISTER_LABELS: Record<string, TranslationKey> = {
  "1": "tradeRegister",
  "2": "foundationRegister",
  "3": "associationRegister",
  "4": "taxAdministration",
  "5": "prepaymentRegister",
  "6": "vatRegister",
  "7": "employerRegister",
  "8": "insuranceRegister",
};

export const AUTHORITY_LABELS: Record<string, TranslationKey> = {
  "1": "taxAdministration",
  "2": "prh",
  "3": "populationRegisterCentre",
};

export const APP_LINKS = {
  prhSwagger: "https://avoindata.prh.fi/fi/ytj/swagger-ui",
  prhSchema: "https://avoindata.prh.fi/opendata-ytj-api/v3/schema?lang=en",
  ytjSearch: YTJ_SEARCH_URL,
};

export interface WhatsNewEntry {
  version: string;
  title: TranslationKey;
  date: string;
  changes: TranslationKey[];
}

export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    version: "0.3.0",
    title: "releaseFinnish",
    date: "2026-10-11",
    changes: ["releaseInterfaceLanguages", "releaseLanguageSettings", "releaseLocalizedData"],
  },
  {
    version: "0.2.1",
    title: "releaseReadable",
    date: "2026-07-25",
    changes: [
      "releaseNamesSpace",
      "releaseNameTooltip",
      "releaseAddressFields",
      "releaseCopyAddress",
      "releaseNameHistory",
    ],
  },
  {
    version: "0.2.0",
    title: "releaseActions",
    date: "2026-07-23",
    changes: ["releaseCopyId", "releaseWebsite", "releaseEInvoice", "releaseCache"],
  },
  {
    version: "0.1.0",
    title: "releaseBeta",
    date: "2026-07-23",
    changes: ["releaseSearch", "releaseDetails", "releaseLinks"],
  },
];
