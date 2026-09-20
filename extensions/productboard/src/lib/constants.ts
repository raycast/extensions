import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.productboard.com/v2/";
const { PUBLIC_API_TOKEN } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${PUBLIC_API_TOKEN}`,
};
