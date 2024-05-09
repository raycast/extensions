import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export type Locale =
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ja"
  | "ru"
  | "pt"
  | "it"
  | "fa"
  | "ar"
  | "pl"
  | "nl"
  | "tr"
  | "el"
  | "zh"
  | "zh-hk"
  | "zh-mo"
  | "zh-my"
  | "zh-sg"
  | "zh-tw"
  | "zh-cn"
  | "uk";

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
  { icon: "🇮🇷", title: "Persian", value: "fa" },
  { icon: "🇦🇪", title: "Arabic", value: "ar" },
  { icon: "🇵🇱", title: "Polish", value: "pl" },
  { icon: "🇳🇱", title: "Dutch", value: "nl" },
  { icon: "🇹🇷", title: "Turkish", value: "tr" },
  { icon: "🇬🇷", title: "Greek", value: "el" },
  { icon: "🇺🇦", title: "Ukraine", value: "uk" },
  { icon: "🇨🇳", title: "Chinese (Simplified)", value: "zh" },
  { icon: "🇭🇰", title: "Chinese (Hong Kong)", value: "zh-hk" },
  { icon: "🇲🇴", title: "Chinese (Macau)", value: "zh-mo" },
  { icon: "🇲🇾", title: "Chinese (Malaysia)", value: "zh-my" },
  { icon: "🇸🇬", title: "Chinese (Singapore)", value: "zh-sg" },
  { icon: "🇹🇼", title: "Chinese (Taiwan)", value: "zh-tw" },
  { icon: "🇨🇳", title: "Chinese (China)", value: "zh-cn" },
];
