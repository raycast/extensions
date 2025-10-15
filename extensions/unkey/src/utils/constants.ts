import { getPreferenceValues } from "@raycast/api";

export const APP_URL = "https://unkey.dev/app/";
export const API_URL = "https://api.unkey.dev/v1/";
export const ACCESS_TOKEN = getPreferenceValues<Preferences>().access_token;
export const WORKSPACE_ID = getPreferenceValues<Preferences>().workspace_id;