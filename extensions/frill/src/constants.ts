import { getPreferenceValues } from "@raycast/api";

const API_KEY = getPreferenceValues<Preferences>().api_key;
const API_TOKEN = btoa(API_KEY + ":");
export const API_HEADERS = {
    Authorization: `Basic ${API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json"
}
export const API_URL = "https://api.frill.co/v1/";