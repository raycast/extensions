import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://developer.ola.cv/api/v1/";
const { api_token } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${api_token}`
}