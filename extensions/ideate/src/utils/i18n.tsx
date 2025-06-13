import { getPreferenceValues } from "@raycast/api";
import { translations, Translation } from "../i18n";

interface Preferences {
  language: string;
}

export function useTranslation(): { t: Translation; language: string } {
  const preferences = getPreferenceValues<Preferences>();
  const language = preferences.language || "en";

  // 如果指定的语言不存在，使用英文作为默认语言
  const t = translations[language] || translations["en"];

  return { t, language };
}
