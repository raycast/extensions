import { getPreferenceValues } from "@raycast/api";

export const API_KEY = getPreferenceValues<Preferences>().apiKey;
export const API_URL = "https://api.rebrandly.com/v1/";
export const MAX_PAGE_SIZE = 25;
