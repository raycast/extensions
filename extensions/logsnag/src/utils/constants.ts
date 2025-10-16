import { getPreferenceValues } from "@raycast/api";

export const API_DOCS_URL = "https://docs.logsnag.com/";
export const API_URL = "https://api.logsnag.com/v1/";
const API_TOKEN = getPreferenceValues<Preferences>().api_token;
export const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_TOKEN}`,
};

export const DEFAULT_EMOJI = "🔔";

export const ALLOWED_LOG_TAG_KEY_REGEX_SCHEMA = /[a-z]+(?:-[a-z]+)*/;
