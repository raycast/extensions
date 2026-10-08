import { getPreferenceValues } from "@raycast/api";

export const VIRTUALIZOR_URL = getPreferenceValues<Preferences>().virtualizor_url;
export const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_PASS = getPreferenceValues<Preferences>().api_pass;
