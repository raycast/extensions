import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { DictionaryPreferences } from "../types";

export const usePreferences = () => {
  return useMemo(() => getPreferenceValues<DictionaryPreferences>(), []);
};
