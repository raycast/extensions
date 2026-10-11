import { getPreferenceValues } from "@raycast/api";
import type { Lang } from "./mlang";

export function getLanguage(): Lang {
  const { language } = getPreferenceValues<Preferences>();
  return language === "it" ? "it" : "en";
}

export function getDownloadDirectory(): string {
  const { downloadDirectory } = getPreferenceValues<Preferences>();
  return downloadDirectory?.trim() || "~/Downloads";
}
