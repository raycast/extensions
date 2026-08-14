import { francAll } from "franc-min";

const ISO_639_3: Record<string, string> = {
  AR: "arb",
  BG: "bul",
  CS: "ces",
  DA: "dan",
  DE: "deu",
  EL: "ell",
  EN: "eng",
  ES: "spa",
  ET: "est",
  FI: "fin",
  FR: "fra",
  HE: "heb",
  HU: "hun",
  ID: "ind",
  IT: "ita",
  JA: "jpn",
  KO: "kor",
  LT: "lit",
  LV: "lav",
  NB: "nob",
  NL: "nld",
  PL: "pol",
  PT: "por",
  RO: "ron",
  RU: "rus",
  SK: "slk",
  SL: "slv",
  SV: "swe",
  TH: "tha",
  TR: "tur",
  UK: "ukr",
  VI: "vie",
  ZH: "cmn",
};

export const LANGUAGE_NAMES: Record<string, string> = {
  AR: "Arabic",
  BG: "Bulgarian",
  CS: "Czech",
  DA: "Danish",
  DE: "German",
  EL: "Greek",
  EN: "English",
  "EN-GB": "English (British)",
  "EN-US": "English (American)",
  ES: "Spanish",
  ET: "Estonian",
  FI: "Finnish",
  FR: "French",
  HE: "Hebrew",
  HU: "Hungarian",
  ID: "Indonesian",
  IT: "Italian",
  JA: "Japanese",
  KO: "Korean",
  LT: "Lithuanian",
  LV: "Latvian",
  NB: "Norwegian Bokmål",
  NL: "Dutch",
  PL: "Polish",
  PT: "Portuguese",
  "PT-BR": "Portuguese (Brazilian)",
  "PT-PT": "Portuguese (European)",
  RO: "Romanian",
  RU: "Russian",
  SK: "Slovak",
  SL: "Slovenian",
  SV: "Swedish",
  TH: "Thai",
  TR: "Turkish",
  UK: "Ukrainian",
  VI: "Vietnamese",
  ZH: "Chinese",
  "ZH-HANS": "Chinese (Simplified)",
  "ZH-HANT": "Chinese (Traditional)",
};

export const TARGET_LANGUAGE_CODES = [
  "AR",
  "BG",
  "ZH-HANS",
  "ZH-HANT",
  "CS",
  "DA",
  "NL",
  "EN-US",
  "EN-GB",
  "ET",
  "FI",
  "FR",
  "DE",
  "EL",
  "HE",
  "HU",
  "ID",
  "IT",
  "JA",
  "KO",
  "LV",
  "LT",
  "NB",
  "PL",
  "PT-BR",
  "PT-PT",
  "RO",
  "RU",
  "SK",
  "SL",
  "ES",
  "SV",
  "TH",
  "TR",
  "UK",
  "VI",
] as const;

export function sourceLanguageCode(language: string) {
  return language.split("-")[0];
}

export function languageName(language: string) {
  return LANGUAGE_NAMES[language] || language;
}

function detectConfiguredLanguage(text: string, primaryLanguage: string, secondaryLanguage: string) {
  const primarySource = sourceLanguageCode(primaryLanguage);
  const secondarySource = sourceLanguageCode(secondaryLanguage);
  const primaryIso = ISO_639_3[primarySource];
  const secondaryIso = ISO_639_3[secondarySource];

  if (!primaryIso || !secondaryIso || primarySource === secondarySource) {
    return undefined;
  }

  const letterCount = [...text.matchAll(/\p{L}/gu)].length;
  if (letterCount < 20) {
    return undefined;
  }

  const candidates = francAll(text, { only: [primaryIso, secondaryIso], minLength: 3 });
  const [best, runnerUp] = candidates;

  if (!best || best[0] === "und" || (runnerUp && best[1] - runnerUp[1] < 0.08)) {
    return undefined;
  }

  return best[0] === primaryIso ? primarySource : secondarySource;
}

export function chooseDirection(text: string, primaryLanguage: string, secondaryLanguage: string) {
  if (!LANGUAGE_NAMES[primaryLanguage] || !LANGUAGE_NAMES[secondaryLanguage]) {
    throw new Error("Run Configure Languages and choose a supported language pair");
  }

  if (sourceLanguageCode(primaryLanguage) === sourceLanguageCode(secondaryLanguage)) {
    throw new Error("Primary and secondary languages must be different languages");
  }

  const detectedLanguage = detectConfiguredLanguage(text, primaryLanguage, secondaryLanguage);
  const targetLang = detectedLanguage === sourceLanguageCode(primaryLanguage) ? secondaryLanguage : primaryLanguage;
  const rule = detectedLanguage
    ? `${languageName(detectedLanguage)} detected → ${languageName(targetLang)}`
    : `Language uncertain → primary (${languageName(primaryLanguage)})`;

  return { targetLang, rule, isUncertain: !detectedLanguage };
}
