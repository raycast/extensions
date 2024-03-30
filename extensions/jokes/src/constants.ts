import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const ENABLE_SAFE_MODE = preferences.enable_safe_mode;
export const FLAGS = Object.entries(preferences).filter(([key]) => key.startsWith("allow_"));
export const API_URL = "https://v2.jokeapi.dev/";
