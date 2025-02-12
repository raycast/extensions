import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preference";

const preference: Preferences = getPreferenceValues();

const ONE_MONTH_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;

export const EBIRD_URL = "https://ebird.org/species";
export const SEARCH_LIMIT = 100;
export const EBIRD_API_TOKEN = preference.EBIRD_API_TOKEN;
export const CACHE_TTL = ONE_MONTH_IN_MILLISECONDS;

export const CACHE_KEY = "RAYCAST_EBIRD";
