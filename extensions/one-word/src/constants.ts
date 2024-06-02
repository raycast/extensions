import { Icon } from "@raycast/api";
import { MenuBarItemProps } from "./types";

export const IS_DEBUG = false;

//file names
export const COMMANDS = {
  "menu-bar": "menu-bar",
  config: "config",
  favorites: "favorites",
  "random-word": "random-word",
};

export enum STORE {
  CONFIG = "config",
  FAVORITES = "favorites",
  WORD_ENTRY = "wordEntry",
}

export const STR = {
  MENU_WARNING: "⚠️ The word was received, but the Menu Bar is not activated. Please activate it.",
  NEW_WORD: "Get New Word",
  PRONUNCIATION: "Listen to Pronunciation",
  ADD_TO_FAVORITES: "Favorite Word",
  REMOVE_FROM_FAVORITES: "Unfavorite Word",
  COPY: "Copy to Clipboard",
  COPY_ALL: "Copy List to Clipboard (JSON)",
  FAILED_LOADING_NEW_WORD: "Error: Unable to Load",
  TOOLTIP: "Word of the Day",
  NO_FAVORITE_WORDS: "No Favorite Words Found",
  FAVORITE_DESCRIPTION: "Save Words from your Mac's Status Bar",
  ERROR: "Something Went Wrong",
  SUCCESS: "Success",
  FIRST_LANGUAGE: "Language 1",
  DROPDOWN_HINT: "Please Select...",
  SECOND_LANGUAGE: "Language 2",
  SWAP: "Swap Words in Menu Bar",
  DELIMITER: "Delimiter",
  LEARNING_LANGUAGE: "I'm Learning",
  NO_LEARNING_LANGUAGE: "Please Select Learning Language",
  COPIED: "Copied to Clipboard!",
  NOT_COPIED: "Failed to Copy to Clipboard",
  NO_WORD_GENERATED: "Please Generate a Random Word First",
  DELIMITER_HINT: "Blur this input, refresh the menu bar, or get a new word to apply changes",
  UPDATE_INTERVAL: "Generate a Word Every",
} as const;

export const MENU: Record<string, MenuBarItemProps> = {
  changeWord: { title: STR.NEW_WORD, shortcut: { key: "r", modifiers: ["cmd"] }, icon: Icon.Repeat },
  pronunciation: { title: STR.PRONUNCIATION, shortcut: { key: "p", modifiers: ["cmd"] }, icon: Icon.SpeakerOn },
  favorite: { title: STR.ADD_TO_FAVORITES, shortcut: { key: "f", modifiers: ["cmd"] }, icon: Icon.Star },
  unfavorite: { title: STR.REMOVE_FROM_FAVORITES, shortcut: { key: "f", modifiers: ["cmd"] }, icon: Icon.StarDisabled },
  copy: { title: STR.COPY, shortcut: { key: "c", modifiers: ["cmd"] }, icon: Icon.CopyClipboard },
} as const;

export const FORM = {
  first: { id: "firstLanguage", title: STR.FIRST_LANGUAGE },
  second: { id: "secondLanguage", title: STR.SECOND_LANGUAGE },
  swap: { id: "swapMenuBar", label: STR.SWAP },
  delimiter: { id: "delimiter", title: STR.DELIMITER, info: STR.DELIMITER_HINT },
  learning: { id: "learningLanguage", title: STR.LEARNING_LANGUAGE },
  updateInterval: { id: "updateInterval", title: STR.UPDATE_INTERVAL },
};

export const UPDATE_INTERVALS = [
  "Off",
  "30 Minutes",
  "Hour",
  "2 Hours",
  "3 Hours",
  "6 Hours",
  "12 Hours",
  "Day",
  "2 Days",
  "3 Days",
] as const;

export const URL = {
  RANDOM_WORD: "https://random-word-api.herokuapp.com/word",
  TRANSLATE: "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&",
  PRONUNCIATION: "https://forvo.com/search",
};

// Random word API
export const SUPPORTED_LANGUAGES_API = ["es", "it", "de", "fr"] as const; // English is'nt supported for url parameters
export const SUPPORTED_LANGUAGES = ["en", "es", "it", "de", "fr"] as const; // but is supported by default

export const LANGUAGES = {
  af: {
    title: "Afrikaans",
    icon: "🇿🇦",
    key: "af",
  },
  sq: {
    title: "Albanian",
    icon: "🇦🇱",
    key: "sq",
  },
  am: {
    title: "Amharic",
    key: "am",
  },
  ar: {
    title: "Arabic",
    key: "ar",
  },
  hy: {
    title: "Armenian",
    icon: "🇦🇲",
    key: "hy",
  },
  az: {
    title: "Azerbaijani",
    icon: "🇦🇿",
    key: "az",
  },
  eu: {
    title: "Basque",
    key: "eu",
  },
  be: {
    title: "Belarusian",
    icon: "🇧🇾",
    key: "be",
  },
  bn: {
    title: "Bengali",
    key: "bn",
  },
  bs: {
    title: "Bosnian",
    icon: "🇧🇦",
    key: "bs",
  },
  bg: {
    title: "Bulgarian",
    icon: "🇧🇬",
    key: "bg",
  },
  ca: {
    title: "Catalan",
    key: "ca",
  },
  ceb: {
    title: "Cebuano",
    key: "ceb",
  },
  "zh-CN": {
    title: "Chinese (Simplified)",
    icon: "🇨🇳",
    key: "zh-CN",
  },
  "zh-TW": {
    title: "Chinese (Traditional)",
    icon: "🇹🇼",
    key: "zh-TW",
  },
  co: {
    title: "Corsican",
    key: "co",
  },
  hr: {
    title: "Croatian",
    icon: "🇭🇷",
    key: "hr",
  },
  cs: {
    title: "Czech",
    icon: "🇨🇿",
    key: "cs",
  },
  da: {
    title: "Danish",
    icon: "🇩🇰",
    key: "da",
  },
  nl: {
    title: "Dutch",
    icon: "🇳🇱",
    key: "nl",
  },
  en: {
    title: "English",
    icon: "🇬🇧",
    key: "en",
  },
  eo: {
    title: "Esperanto",
    key: "eo",
  },
  et: {
    title: "Estonian",
    icon: "🇪🇪",
    key: "et",
  },
  fi: {
    title: "Finnish",
    icon: "🇫🇮",
    key: "fi",
  },
  fr: {
    title: "French",
    icon: "🇫🇷",
    key: "fr",
  },
  fy: {
    title: "Frisian",
    key: "fy",
  },
  gl: {
    title: "Galician",
    key: "gl",
  },
  ka: {
    title: "Georgian",
    icon: "🇬🇪",
    key: "ka",
  },
  de: {
    title: "German",
    icon: "🇩🇪",
    key: "de",
  },
  el: {
    title: "Greek",
    icon: "🇬🇷",
    key: "el",
  },
  gu: {
    title: "Gujarati",
    key: "gu",
  },
  ht: {
    title: "Haitian Creole",
    icon: "🇭🇹",
    key: "ht",
  },
  ha: {
    title: "Hausa",
    key: "ha",
  },
  haw: {
    title: "Hawaiian",
    icon: "🌺",
    key: "haw",
  },
  he: {
    title: "Hebrew",
    icon: "🇮🇱",
    key: "he",
  },
  hi: {
    title: "Hindi",
    icon: "🇮🇳",
    key: "hi",
  },
  hmn: {
    title: "Hmong",
    key: "hmn",
  },
  hu: {
    title: "Hungarian",
    icon: "🇭🇺",
    key: "hu",
  },
  is: {
    title: "Icelandic",
    icon: "🇮🇸",
    key: "is",
  },
  ig: {
    title: "Igbo",
    key: "ig",
  },
  id: {
    title: "Indonesian",
    icon: "🇮🇩",
    key: "id",
  },
  ga: {
    title: "Irish",
    icon: "🇮🇪",
    key: "ga",
  },
  it: {
    title: "Italian",
    icon: "🇮🇹",
    key: "it",
  },
  ja: {
    title: "Japanese",
    icon: "🇯🇵",
    key: "ja",
  },
  jv: {
    title: "Javanese",
    key: "jv",
  },
  kn: {
    title: "Kannada",
    key: "kn",
  },
  kk: {
    title: "Kazakh",
    icon: "🇰🇿",
    key: "kk",
  },
  km: {
    title: "Khmer",
    key: "km",
  },
  rw: {
    title: "Kinyarwanda",
    key: "rw",
  },
  ko: {
    title: "Korean",
    icon: "🇰🇷",
    key: "ko",
  },
  ku: {
    title: "Kurdish",
    key: "ku",
  },
  ky: {
    title: "Kyrgyz",
    key: "ky",
  },
  lo: {
    title: "Lao",
    key: "lo",
  },
  lv: {
    title: "Latvian",
    icon: "🇱🇻",
    key: "lv",
  },
  lt: {
    title: "Lithuanian",
    icon: "🇱🇹",
    key: "lt",
  },
  lb: {
    title: "Luxembourgish",
    icon: "🇱🇺",
    key: "lb",
  },
  mk: {
    title: "Macedonian",
    icon: "🇲🇰",
    key: "mk",
  },
  mg: {
    title: "Malagasy",
    key: "mg",
  },
  ms: {
    title: "Malay",
    icon: "🇲🇾",
    key: "ms",
  },
  ml: {
    title: "Malayalam",
    key: "ml",
  },
  mt: {
    title: "Maltese",
    icon: "🇲🇹",
    key: "mt",
  },
  mi: {
    title: "Maori",
    icon: "🇳🇿",
    key: "mi",
  },
  mr: {
    title: "Marathi",
    key: "mr",
  },
  mn: {
    title: "Mongolian",
    icon: "🇲🇳",
    key: "mn",
  },
  my: {
    title: "Myanmar (Burmese)",
    icon: "🇲🇲",
    key: "my",
  },
  ne: {
    title: "Nepali",
    icon: "🇳🇵",
    key: "ne",
  },
  no: {
    title: "Norwegian",
    icon: "🇳🇴",
    key: "no",
  },
  ny: {
    title: "Nyanja (Chichewa)",
    key: "ny",
  },
  or: {
    title: "Odia (Oriya)",
    key: "or",
  },
  ps: {
    title: "Pashto",
    key: "ps",
  },
  fa: {
    title: "Persian",
    icon: "🇮🇷",
    key: "fa",
  },
  pl: {
    title: "Polish",
    icon: "🇵🇱",
    key: "pl",
  },
  pt: {
    title: "Portuguese",
    icon: "🇵🇹",
    key: "pt",
  },
  pa: {
    title: "Punjabi",
    icon: "🇮🇳",
    key: "pa",
  },
  ro: {
    title: "Romanian",
    icon: "🇷🇴",
    key: "ro",
  },
  ru: {
    title: "Russian",
    icon: "🇷🇺",
    key: "ru",
  },
  sm: {
    title: "Samoan",
    key: "sm",
  },
  gd: {
    title: "Scots Gaelic",
    icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    key: "gd",
  },
  sr: {
    title: "Serbian",
    icon: "🇷🇸",
    key: "sr",
  },
  st: {
    title: "Sesotho",
    key: "st",
  },
  sn: {
    title: "Shona",
    key: "sn",
  },
  sd: {
    title: "Sindhi",
    key: "sd",
  },
  si: {
    title: "Sinhala (Sinhalese)",
    key: "si",
  },
  sk: {
    title: "Slovak",
    icon: "🇸🇰",
    key: "sk",
  },
  sl: {
    title: "Slovenian",
    icon: "🇸🇮",
    key: "sl",
  },
  so: {
    title: "Somali",
    icon: "🇸🇴",
    key: "so",
  },
  es: {
    title: "Spanish",
    icon: "🇪🇸",
    key: "es",
  },
  su: {
    title: "Sundanese",
    icon: "🇸🇩",
    key: "su",
  },
  sw: {
    title: "Swahili",
    key: "sw",
  },
  sv: {
    title: "Swedish",
    icon: "🇸🇪",
    key: "sv",
  },
  tl: {
    title: "Tagalog (Filipino)",
    icon: "🇵🇭",
    key: "tl",
  },
  tg: {
    title: "Tajik",
    key: "tg",
  },
  ta: {
    title: "Tamil",
    key: "ta",
  },
  tt: {
    title: "Tatar",
    key: "tt",
  },
  te: {
    title: "Telugu",
    key: "te",
  },
  th: {
    title: "Thai",
    key: "th",
  },
  tr: {
    title: "Turkish",
    icon: "🇹🇷",
    key: "tr",
  },
  tk: {
    title: "Turkmen",
    icon: "🇹🇲",
    key: "tk",
  },
  uk: {
    title: "Ukrainian",
    icon: "🇺🇦",
    key: "uk",
  },
  ur: {
    title: "Urdu",
    key: "ur",
  },
  ug: {
    title: "Uyghur",
    key: "ug",
  },
  uz: {
    title: "Uzbek",
    key: "uz",
  },
  vi: {
    title: "Vietnamese",
    icon: "🇻🇳",
    key: "vi",
  },
  cy: {
    title: "Welsh",
    icon: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    key: "cy",
  },
  xh: {
    title: "Xhosa",
    key: "xh",
  },
  yi: {
    title: "Yiddish",
    icon: "🇮🇱",
    key: "yi",
  },
  yo: {
    title: "Yoruba",
    key: "yo",
  },
  zu: {
    title: "Zulu",
    key: "zu",
  },
} as const;
