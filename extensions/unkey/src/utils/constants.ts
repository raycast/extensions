import { getPreferenceValues } from "@raycast/api";
import { ApiHeaders } from "./types";

export const APP_URL = "https://unkey.dev/app/";
export const API_URL = "https://api.unkey.dev/v1/";
const ACCESS_TOKEN = getPreferenceValues<Preferences>().access_token;
export const API_HEADERS: ApiHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

export const RATELIMIT_TYPES = ["fast", "consistent"];
