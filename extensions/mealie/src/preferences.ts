import { getPreferenceValues } from "@raycast/api";
import { normalizeBaseUrl, type MealieConfig } from "./api/client";

/**
 * `Preferences` wird von Raycast aus der package.json nach raycast-env.d.ts
 * generiert. Eine eigene Kopie des Schemas wuerde bei jeder Aenderung an den
 * Preferences auseinanderlaufen, ohne dass der Typcheck es meldet.
 */
export function getMealieConfig(): MealieConfig {
  const prefs = getPreferenceValues<Preferences>();
  return {
    baseUrl: normalizeBaseUrl(prefs.mealieUrl),
    token: prefs.apiToken.trim(),
    allowInsecureHttp: prefs.allowInsecureHttp === true,
  };
}
