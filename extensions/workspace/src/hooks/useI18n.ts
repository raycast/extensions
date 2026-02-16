import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { STORAGE_KEY_LANGUAGE } from "../utils/constants";
import { t as translate, Language } from "../utils/i18n";

export function useI18n() {
  const [language, setLanguage] = useCachedState<Language>(STORAGE_KEY_LANGUAGE, "en");

  const t = useCallback(
    (key: string, variables?: Record<string, string>) => {
      let text = translate(key, language);
      if (variables) {
        Object.entries(variables).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [language],
  );

  return {
    language,
    setLanguage,
    t,
  };
}
