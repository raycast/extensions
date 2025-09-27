import { getPreferenceValues } from "@raycast/api";

const { api_token } = getPreferenceValues<Preferences>();
export const API_URL = "https://app.youform.com/api/";
export const API_HEADERS = {
  Authorization: `Bearer ${api_token}`,
  Accept: "application/json",
};
