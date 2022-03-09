import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { LanguageCode } from "./languages";

export type TranslatePreferences = {
  lang1: LanguageCode;
  lang2: LanguageCode;
};

export const usePreferences = () => {
  return React.useMemo(() => getPreferenceValues<TranslatePreferences>(), []);
};
