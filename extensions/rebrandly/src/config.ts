import { getPreferenceValues } from "@raycast/api";

const API_KEY = getPreferenceValues<Preferences>().apiKey;
export const API_HEADERS = {
  apikey: API_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};
export const API_URL = "https://api.rebrandly.com/v1/";
export const MAX_PAGE_SIZE = 25;
