import { getPreferenceValues } from "@raycast/api";
import { Languages } from "dictcc";

export const getPreferences = () =>
  getPreferenceValues<{
    sourceLanguage: Languages;
    targetLanguage: Languages;
  }>();
