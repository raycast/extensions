import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://horoscope-app-api.vercel.app/api/v1/get-horoscope/";
export const DEFAULT_SIGN = getPreferenceValues<Preferences>().default_sign;
