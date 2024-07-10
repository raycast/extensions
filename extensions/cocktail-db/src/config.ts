import { getPreferenceValues } from "@raycast/api";

const { api_key = "1" } = getPreferenceValues<Preferences>();
export const API_URL = `https://www.thecocktaildb.com/api/json/v1/${api_key}/`;
