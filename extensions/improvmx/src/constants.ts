import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.improvmx.com/v3/";
const API_TOKEN = getPreferenceValues<Preferences>().api_token;
const AUTH = Buffer.from("api:" + API_TOKEN).toString("base64");
const API_AUTHORIZATION = "Basic " + AUTH;
export const API_HEADERS = {
    Authorization: API_AUTHORIZATION,
    "Content-Type": "application/json",
};