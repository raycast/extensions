import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.hetrixtools.com/v3/";
export const API_KEY = getPreferenceValues<Preferences>().api_key;
export const DEFAULT_PER_PAGE = "20";
