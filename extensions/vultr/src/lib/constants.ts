import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.vultr.com/v2/";
const API_PAT = getPreferenceValues<Preferences>().personal_access_token;
export const API_HEADERS = {
    Authorization: `Bearer ${API_PAT}`,
    "Content-Type": "application/json"
}