import { getPreferenceValues } from "@raycast/api";
import { Languages } from "dictcc";

export const getPreferences = () =>
  getPreferenceValues<{
    sourceLanguage: Languages;
    targetLanguage: Languages;
  }>();

export const supportedLanguages = [
  {
    title: "Albanian",
    flag: "🇦🇱",
    value: "sq",
  },
  {
    title: "Bosnian",
    flag: "🇧🇦",
    value: "bs",
  },
  {
    title: "Bulgarian",
    flag: "🇧🇬",
    value: "bg",
  },
  {
    title: "Croatian",
    flag: "🇭🇷",
    value: "hr",
  },
  {
    title: "Czech",
    flag: "🇨🇿",
    value: "cs",
  },
  {
    title: "Danish",
    flag: "🇩🇰",
    value: "da",
  },
  {
    title: "Dutch",
    flag: "🇳🇱",
    value: "nl",
  },
  {
    title: "English",
    flag: "🇬🇧",
    value: "en",
  },
  {
    title: "Esperanto",
    value: "eo",
  },
  {
    title: "Finnish",
    flag: "🇫🇮",
    value: "fi",
  },
  {
    title: "French",
    flag: "🇫🇷",
    value: "fr",
  },
  {
    title: "German",
    flag: "🇩🇪",
    value: "de",
  },
  {
    title: "Greek",
    flag: "🇬🇷",
    value: "el",
  },
  {
    title: "Hungarian",
    flag: "🇭🇺",
    value: "hu",
  },
  {
    title: "Icelandic",
    flag: "🇮🇸",
    value: "is",
  },
  {
    title: "Italian",
    flag: "🇮🇹",
    value: "it",
  },
  {
    title: "Latin",
    value: "la",
  },
  {
    title: "Norwegian",
    flag: "🇳🇴",
    value: "no",
  },
  {
    title: "Polish",
    flag: "🇵🇱",
    value: "pl",
  },
  {
    title: "Portuguese",
    flag: "🇵🇹",
    value: "pt",
  },
  {
    title: "Romanian",
    flag: "🇷🇴",
    value: "ro",
  },
  {
    title: "Russian",
    flag: "🇷🇺",
    value: "ru",
  },
  {
    title: "Serbian",
    flag: "🇷🇸",
    value: "sr",
  },
  {
    title: "Slovakian",
    flag: "🇸🇰",
    value: "sk",
  },
  {
    title: "Spanish",
    flag: "🇪🇸",
    value: "es",
  },
  {
    title: "Swedish",
    flag: "🇸🇪",
    value: "sv",
  },
  {
    title: "Turkish",
    flag: "🇹🇷",
    value: "tr",
  },
];
