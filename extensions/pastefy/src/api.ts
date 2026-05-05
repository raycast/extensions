import { getPreferenceValues } from "@raycast/api";

export const PASTEFY_URL = "https://pastefy.app";
export const API_URL = `${PASTEFY_URL}/api/v2`;
const { apiKey } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};
