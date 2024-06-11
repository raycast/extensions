import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://www.namesilo.com/api/";
const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_PARAMS = new URLSearchParams({
    version: "1",
    type: "json",
    key: API_KEY
})