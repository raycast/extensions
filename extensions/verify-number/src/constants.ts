import { getPreferenceValues } from "@raycast/api";

const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_URL = "https://api.apilayer.com/number_verification/";
export const API_HEADERS = {
  apikey: API_KEY,
};
