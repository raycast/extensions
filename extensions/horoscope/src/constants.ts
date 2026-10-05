import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://freehoroscopeapi.com/api/v1/get-horoscope/";
export const DEFAULT_SIGN = getPreferenceValues<Preferences>().default_sign;
