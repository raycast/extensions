import { getPreferenceValues } from "@raycast/api";

export const APP_URL = "https://app.mailwip.com/";
export const API_URL = "https://api.mailwip.com/v1/";
const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_HEADERS = {
  "Content-Type": "application/json",
  apikey: API_KEY,
};

export const EMAIL_STATUS = ["sent", "spam", "outgoing"];
