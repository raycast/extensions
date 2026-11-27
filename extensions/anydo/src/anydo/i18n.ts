import { lang } from "./prefs";

/** Tiny two-language helper: t("فارسی", "English"). */
export function t(fa: string, en: string): string {
  return lang() === "en" ? en : fa;
}
