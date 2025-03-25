import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.manotori.com/v1/";
const { api_token } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${api_token}`,
};
