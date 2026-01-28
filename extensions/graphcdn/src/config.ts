import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://graph.stellate.co/";
const { token } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
