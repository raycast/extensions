import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.productboard.com/";
const { PUBLIC_API_TOKEN } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  "X-Version": "1",
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${PUBLIC_API_TOKEN}`,
};
export const DEFAULT_PAGE_LIMIT = 20;
