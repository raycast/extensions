// fallow-ignore-next-line unresolved-import
import { getPreferenceValues } from "@raycast/api";

export interface FigaPreferences {
  apiKey: string;
}

export function getFigaPreferences(): FigaPreferences {
  const preferences = getPreferenceValues<FigaPreferences>();

  return {
    apiKey: preferences.apiKey.trim(),
  };
}
