import { getPreferenceValues } from "@raycast/api";

export const CONTENTFUL_SPACE = getPreferenceValues<Preferences>().space;
export const CONTENTFUL_TOKEN = getPreferenceValues<Preferences>().token;
export const CONTENTFUL_ENVIRONMENT = getPreferenceValues<Preferences>().environment || "master";

export const CONTENTFUL_LIMIT = 100;
export const CONTENTFUL_APP_URL = "https://app.contentful.com/";
export const CONTENTFUL_LOCALE = "en-US";
