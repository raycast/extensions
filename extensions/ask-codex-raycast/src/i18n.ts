import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ptBR from "./locales/pt-BR.json";
import ru from "./locales/ru.json";

export const locales = [
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "ru", name: "Русский" },
] as const;
export type Locale = (typeof locales)[number]["code"];
export type MessageKey = keyof typeof en;
const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ja,
  ko,
  es,
  fr,
  de,
  "pt-BR": ptBR,
  ru,
};
// Preserve the previous language for direct consumers; the command explicitly
// selects the saved locale (English before setup) before mounting any chat UI.
let activeLocale: Locale = "zh-CN";
export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale.code === value);
}
export function setLocale(value: string): void {
  activeLocale = isLocale(value) ? value : "en";
}
export function t(
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  const text = catalogs[activeLocale][key] || en[key];
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder,
  );
}
