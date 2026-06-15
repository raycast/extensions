import { getPreferenceValues } from "@raycast/api";

const { accessToken } = getPreferenceValues<Preferences>();
export const API_URL = "https://api-ssl.bitly.com/v4";
export const API_HEADERS = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};
