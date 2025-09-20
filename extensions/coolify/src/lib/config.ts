import { getPreferenceValues } from "@raycast/api";

export const COOLIFY_URL = getPreferenceValues<Preferences>().coolify_url;
export const API_TOKEN = getPreferenceValues<Preferences>().api_token;
