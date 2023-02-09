import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { LanguageCode } from "./languages";
import { useCachedState } from "@raycast/utils";

export type LanguageCodeSet = { langFrom: LanguageCode; langTo: LanguageCode };

export type TranslatePreferences = {
  lang1: LanguageCode;
  lang2: LanguageCode;
};

export const usePreferences = () => {
  return React.useMemo(() => getPreferenceValues<TranslatePreferences>(), []);
};

export const useSelectedLanguagesSet = () => {
  const preferences = usePreferences();
  const [selectedLanguageSet, setSelectedLanguageSet] = useCachedState<LanguageCodeSet>("selectedLanguageSet", {
    langFrom: preferences.lang1,
    langTo: preferences.lang2,
  });

  return [selectedLanguageSet, setSelectedLanguageSet] as const;
};
