import { getPreferenceValues } from "@raycast/api";

export const COOLIFY_URL = getPreferenceValues<Preferences>().coolify_url;
const API_TOKEN = getPreferenceValues<Preferences>().api_token;
export const API_HEADERS = {
  Authorization: `Bearer ${API_TOKEN}`,
  "Content-Type": "application/json",
};
