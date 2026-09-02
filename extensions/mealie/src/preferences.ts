import { getPreferenceValues } from "@raycast/api";
import { normalizeBaseUrl, type MealieConfig } from "./api/client";

interface RawPreferences {
  mealieUrl: string;
  apiToken: string;
  allowInsecureHttp?: boolean;
}

export function getMealieConfig(): MealieConfig {
  const prefs = getPreferenceValues<RawPreferences>();
  return {
    baseUrl: normalizeBaseUrl(prefs.mealieUrl),
    token: prefs.apiToken.trim(),
    allowInsecureHttp: prefs.allowInsecureHttp === true,
  };
}
