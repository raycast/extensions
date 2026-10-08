export const DEFAULT_LOCALE = "en" as const;
export const DEFAULT_CACHE_TTL_MINUTES = 1440;
export const RAW_BASE_URL =
  "https://raw.githubusercontent.com/jesseduffield/lazygit/master/docs/keybindings";

export const SUPPORTED_LOCALES: ReadonlyArray<{
  title: string;
  value: string;
}> = [
  { title: "English", value: "en" },
  { title: "Japanese", value: "ja" },
  { title: "Korean", value: "ko" },
  { title: "Dutch", value: "nl" },
  { title: "Polish", value: "pl" },
  { title: "Portuguese", value: "pt" },
  { title: "Russian", value: "ru" },
  { title: "Chinese (Simplified)", value: "zh-CN" },
  { title: "Chinese (Traditional)", value: "zh-TW" },
];

export function buildLocaleUrl(locale: string): string {
  return `${RAW_BASE_URL}/Keybindings_${locale}.md`;
}
