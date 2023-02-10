import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { LanguageCodeSet, TranslatePreferences } from "./types";

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

export const usePreferencesLanguageSet = () => {
  const preferences = usePreferences();
  const preferencesLanguageSet: LanguageCodeSet = { langFrom: preferences.lang1, langTo: preferences.lang2 };
  return preferencesLanguageSet;
};

export const isSameLanguageSet = (langSet1: LanguageCodeSet, langSet2: LanguageCodeSet) => {
  return langSet1.langFrom === langSet2.langFrom && langSet1.langTo === langSet2.langTo;
};
