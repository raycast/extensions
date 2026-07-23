import { fr } from "./fr";
import { es } from "./es";
import { it } from "./it";
import { de } from "./de";
import { pt } from "./pt";
import { nl } from "./nl";
import { sv } from "./sv";
import { pl } from "./pl";
import { ru } from "./ru";
import { el } from "./el";
import { tr } from "./tr";
import { ar } from "./ar";
import { hi } from "./hi";
import { zh } from "./zh";
import { ja } from "./ja";
import { ko } from "./ko";

export type TranslationLang =
  | "fr"
  | "es"
  | "it"
  | "de"
  | "pt"
  | "nl"
  | "sv"
  | "pl"
  | "ru"
  | "el"
  | "tr"
  | "ar"
  | "hi"
  | "zh"
  | "ja"
  | "ko";

/** Native label shown as the translation row title. */
export const LANG_LABELS: Record<TranslationLang, string> = {
  fr: "Français",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
  pl: "Polski",
  ru: "Русский",
  el: "Ελληνικά",
  tr: "Türkçe",
  ar: "العربية",
  hi: "हिन्दी",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

/** All translations, indexed by language then English base form. */
export const TRANSLATIONS: Record<TranslationLang, Record<string, string>> = {
  fr,
  es,
  it,
  de,
  pt,
  nl,
  sv,
  pl,
  ru,
  el,
  tr,
  ar,
  hi,
  zh,
  ja,
  ko,
};
