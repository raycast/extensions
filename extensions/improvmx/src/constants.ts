import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.improvmx.com/v3/";
const API_TOKEN = getPreferenceValues<Preferences>().api_token;
const AUTH = Buffer.from("api:" + API_TOKEN).toString("base64");
export const API_HEADERS = {
    Authorization: "Basic " + AUTH,
    "Content-Type": "application/json",
};