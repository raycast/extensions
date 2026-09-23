import { getPreferenceValues } from "@raycast/api";
import { t, zh, type Messages } from "./lib/i18n";

export function useMessages(): Messages {
  return getPreferenceValues<Preferences>().language === "zh-CN" ? zh : t;
}
