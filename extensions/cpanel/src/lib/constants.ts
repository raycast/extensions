import { getPreferenceValues } from "@raycast/api";

export const CPANEL_URL = getPreferenceValues<Preferences>().cpanel_url;
export const CPANEL_USERNAME = getPreferenceValues<Preferences>().cpanel_username;
export const API_TOKEN = getPreferenceValues<Preferences>().api_token;

export const DEFAULT_ICON = { light: "cpanel.png", dark: "cpanel@dark.png" };
