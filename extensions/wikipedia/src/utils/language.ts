import { useCachedState } from "@raycast/utils";
import { Cache } from "@raycast/api";

export type Locale =
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ja"
  | "ru"
  | "pt"
  | "it"
  | "zh"
  | "fa"
  | "ar"
  | "pl"
  | "nl"
  | "tr"
  | "el";

export function useLanguage() {
  return useCachedState<Locale>("language", "en");
}

export async function getStoredLanguage() {
  const cache = new Cache();
  const language = await cache.get("language");
  return (language ? JSON.parse(language) : "en") as Locale;
}

export const languages: { icon: string; title: string; value: Locale }[] = [
  { icon: "🇺🇸", title: "English", value: "en" },
  { icon: "🇪🇸", title: "Spanish", value: "es" },
  { icon: "🇩🇪", title: "German", value: "de" },
  { icon: "🇫🇷", title: "French", value: "fr" },
  { icon: "🇯🇵", title: "Japanese", value: "ja" },
  { icon: "🇷🇺", title: "Russian", value: "ru" },
  { icon: "🇵🇹", title: "Portuguese", value: "pt" },
  { icon: "🇮🇹", title: "Italian", value: "it" },
  { icon: "🇨🇳", title: "Chinese", value: "zh" },
  { icon: "🇮🇷", title: "Persian", value: "fa" },
  { icon: "🇦🇪", title: "Arabic", value: "ar" },
  { icon: "🇵🇱", title: "Polish", value: "pl" },
  { icon: "🇸🇽", title: "Dutch", value: "nl" },
  { icon: "🇹🇷", title: "Turkish", value: "tr" },
  { icon: "🇬🇷", title: "Greek", value: "el" },
];
