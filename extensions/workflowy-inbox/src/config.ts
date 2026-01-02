import { getPreferenceValues } from "@raycast/api";

const { apiKey } = getPreferenceValues<Preferences>();
export const API_URL = "https://workflowy.com/api/";
export const API_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
};
