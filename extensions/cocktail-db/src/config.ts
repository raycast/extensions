import { getPreferenceValues } from "@raycast/api";

const { api_key = "1" } = getPreferenceValues<Preferences>();
export const BASE_URL = "https://www.thecocktaildb.com/";
export const API_URL = `${BASE_URL}api/json/v1/${api_key}/`;
