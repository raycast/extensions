import { franc } from "franc-min";

export type Language = {
  code: string;
  title: string;
  nativeName: string;
};

export const AUTO_LANGUAGE: Language = {
  code: "auto",
  title: "Detect Language",
  nativeName: "Automatic",
};

export const LANGUAGES: Language[] = [
  { code: "ar", title: "Arabic", nativeName: "العربية" },
  { code: "bg", title: "Bulgarian", nativeName: "Български" },
  { code: "ca", title: "Catalan", nativeName: "Català" },
  { code: "zh", title: "Chinese", nativeName: "中文" },
  { code: "hr", title: "Croatian", nativeName: "Hrvatski" },
  { code: "cs", title: "Czech", nativeName: "Čeština" },
  { code: "da", title: "Danish", nativeName: "Dansk" },
  { code: "nl", title: "Dutch", nativeName: "Nederlands" },
  { code: "en", title: "English", nativeName: "English" },
  { code: "et", title: "Estonian", nativeName: "Eesti" },
  { code: "fi", title: "Finnish", nativeName: "Suomi" },
  { code: "fr", title: "French", nativeName: "Français" },
  { code: "de", title: "German", nativeName: "Deutsch" },
  { code: "el", title: "Greek", nativeName: "Ελληνικά" },
  { code: "he", title: "Hebrew", nativeName: "עברית" },
  { code: "hi", title: "Hindi", nativeName: "हिन्दी" },
  { code: "hu", title: "Hungarian", nativeName: "Magyar" },
  { code: "id", title: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it", title: "Italian", nativeName: "Italiano" },
  { code: "ja", title: "Japanese", nativeName: "日本語" },
  { code: "ko", title: "Korean", nativeName: "한국어" },
  { code: "lv", title: "Latvian", nativeName: "Latviešu" },
  { code: "lt", title: "Lithuanian", nativeName: "Lietuvių" },
  { code: "ms", title: "Malay", nativeName: "Bahasa Melayu" },
  { code: "no", title: "Norwegian", nativeName: "Norsk" },
  { code: "fa", title: "Persian", nativeName: "فارسی" },
  { code: "pl", title: "Polish", nativeName: "Polski" },
  { code: "pt", title: "Portuguese", nativeName: "Português" },
  { code: "ro", title: "Romanian", nativeName: "Română" },
  { code: "ru", title: "Russian", nativeName: "Русский" },
  { code: "sr", title: "Serbian", nativeName: "Српски" },
  { code: "sk", title: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", title: "Slovenian", nativeName: "Slovenščina" },
  { code: "es", title: "Spanish", nativeName: "Español" },
  { code: "sw", title: "Swahili", nativeName: "Kiswahili" },
  { code: "sv", title: "Swedish", nativeName: "Svenska" },
  { code: "th", title: "Thai", nativeName: "ไทย" },
  { code: "tr", title: "Turkish", nativeName: "Türkçe" },
  { code: "uk", title: "Ukrainian", nativeName: "Українська" },
  { code: "ur", title: "Urdu", nativeName: "اردو" },
  { code: "vi", title: "Vietnamese", nativeName: "Tiếng Việt" },
];

export function getLanguage(code: string): Language | undefined {
  if (code === AUTO_LANGUAGE.code) return AUTO_LANGUAGE;
  return LANGUAGES.find((language) => language.code === code);
}

export function normalizeLanguageCode(code: string): string {
  const normalized = code.trim().toLowerCase().replace("_", "-");
  if (normalized.startsWith("zh")) return "zh";
  return normalized.split("-")[0] ?? normalized;
}

const FRANC_TO_ISO: Record<string, string> = {
  arb: "ar",
  bul: "bg",
  ces: "cs",
  cmn: "zh",
  deu: "de",
  ell: "el",
  eng: "en",
  fra: "fr",
  hin: "hi",
  hrv: "hr",
  hun: "hu",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  pes: "fa",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  srp: "sr",
  swe: "sv",
  swh: "sw",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  vie: "vi",
  zlm: "ms",
};

const SHORT_TEXT_LIMIT = 48;

const SHORT_LANGUAGE_HINTS: Record<string, Record<string, number>> = {
  de: {
    bitte: 3,
    danke: 4,
    guten: 2,
    hallo: 4,
    morgen: 2,
    nicht: 2,
  },
  en: {
    are: 1,
    hello: 4,
    how: 1,
    please: 3,
    thank: 3,
    thanks: 4,
    this: 2,
    you: 1,
  },
  es: {
    buenos: 2,
    gracias: 4,
    hola: 4,
    favor: 2,
    por: 1,
    estas: 2,
    estás: 3,
  },
  fr: {
    avec: 2,
    bien: 1,
    bonjour: 4,
    comment: 1,
    français: 4,
    je: 2,
    merci: 3,
    nous: 2,
    pourquoi: 3,
    salut: 3,
    tu: 1,
    va: 1,
    vais: 3,
    vous: 2,
    ça: 4,
  },
  it: {
    buongiorno: 4,
    ciao: 4,
    come: 1,
    grazie: 4,
    stai: 3,
  },
  nl: {
    alsjeblieft: 4,
    bedankt: 4,
    dank: 3,
    goed: 2,
    hallo: 3,
  },
  pt: {
    bom: 2,
    dia: 1,
    obrigado: 4,
    obrigada: 4,
    ola: 3,
    olá: 4,
    voce: 3,
    você: 4,
  },
  tr: {
    cok: 2,
    degil: 3,
    değil: 4,
    evet: 3,
    hayir: 3,
    hayır: 4,
    iyi: 2,
    merhaba: 4,
    nasilsin: 4,
    nasılsın: 4,
    selam: 3,
    tesekkurler: 4,
    teşekkürler: 4,
    çok: 3,
  },
};

function detectShortTextLanguage(text: string): string {
  if (/[\u3040-\u30ff]/u.test(text)) return "ja";
  if (/[\uac00-\ud7af]/u.test(text)) return "ko";
  if (/[\u0e00-\u0e7f]/u.test(text)) return "th";
  if (/[\u0900-\u097f]/u.test(text)) return "hi";
  if (/[\u0370-\u03ff]/u.test(text)) return "el";
  if (/[\u0590-\u05ff]/u.test(text)) return "he";
  if (/[\u4e00-\u9fff]/u.test(text)) return "zh";

  const normalized = text.normalize("NFC").toLowerCase();
  const tokens =
    normalized.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];
  const scores = new Map<string, number>();

  for (const [language, hints] of Object.entries(SHORT_LANGUAGE_HINTS)) {
    const score = tokens.reduce(
      (total, token) => total + (hints[token] ?? 0),
      0,
    );
    scores.set(language, score);
  }

  if (/[ğış]/u.test(normalized)) {
    scores.set("tr", (scores.get("tr") ?? 0) + 4);
  }
  if (/œ/u.test(normalized)) {
    scores.set("fr", (scores.get("fr") ?? 0) + 4);
  }
  if (/[ñ¿¡]/u.test(normalized)) {
    scores.set("es", (scores.get("es") ?? 0) + 4);
  }
  if (/[ãõ]/u.test(normalized)) {
    scores.set("pt", (scores.get("pt") ?? 0) + 4);
  }
  if (/ß/u.test(normalized)) {
    scores.set("de", (scores.get("de") ?? 0) + 4);
  }

  const ranked = [...scores.entries()].sort(
    ([, firstScore], [, secondScore]) => secondScore - firstScore,
  );
  const [bestLanguage, bestScore = 0] = ranked[0] ?? [];
  const secondScore = ranked[1]?.[1] ?? 0;

  return bestLanguage && bestScore >= 4 && bestScore - secondScore >= 2
    ? bestLanguage
    : "";
}

export function detectLanguageLocally(text: string): string {
  const compact = text.replace(/https?:\/\/\S+|`[^`]*`|\s+/g, " ").trim();
  if (!compact) return "";

  const shortTextLanguage = detectShortTextLanguage(compact);
  if (shortTextLanguage) return shortTextLanguage;

  // Trigram detection is unreliable for short input (for example, franc-min
  // classifies "salut ça va" as Turkish). An unknown label is safer than a
  // confidently wrong one until the model returns its detected language.
  if (compact.length < SHORT_TEXT_LIMIT) return "";

  const detected = franc(compact, {
    minLength: SHORT_TEXT_LIMIT,
    only: Object.keys(FRANC_TO_ISO),
  });

  return FRANC_TO_ISO[detected] ?? "";
}
