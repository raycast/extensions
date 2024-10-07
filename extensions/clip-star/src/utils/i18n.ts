import { getPreferenceValues } from "@raycast/api";
import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";

export type LocaleStrings = typeof en;

export function getCurrentLanguage(): "en" | "zh-CN" {
  const preferences = getPreferenceValues<{ language: "en" | "zh-CN" }>();
  return preferences.language || "en";
}

export function getLocalizedStrings(): LocaleStrings {
  const language = getCurrentLanguage();
  return language === "zh-CN" ? zhCN : en;
}
