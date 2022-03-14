import { getPreferenceValues } from "@raycast/api";

export const API_KEY = "apiKey";
export const SHOW_PREVIEW = "showGifPreview";
export const DEFAULT_ACTION = "defaultAction";

export type ServiceName = "giphy" | "tenor";
export const GIF_SERVICE: { [name: string]: ServiceName } = {
  GIPHY: "giphy",
  TENOR: "tenor",
};

export type Preference = { [preferenceName: string]: any };

let prefs: Preference;

export function getPrefs() {
  if (!prefs) {
    prefs = getPreferenceValues<Preference>();
  }

  return prefs;
}

export function getAPIKey(serviceName: ServiceName) {
  return getPrefs()[`${serviceName}-${API_KEY}`];
}

export function getShowPreview() {
  return getPrefs()[SHOW_PREVIEW];
}

export function getDefaultAction() {
  return getPrefs()[DEFAULT_ACTION];
}
