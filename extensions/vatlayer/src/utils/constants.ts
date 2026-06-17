import { getPreferenceValues } from "@raycast/api";

export const ACCESS_KEY = getPreferenceValues<Preferences>().access_key;
const USE_HTTPS = getPreferenceValues<Preferences>().use_https;

export const BASE_URL = USE_HTTPS ? "https://apilayer.net/api/" : "http://apilayer.net/api/";
export const DOCS_URL = "https://vatlayer.com/documentation#";
