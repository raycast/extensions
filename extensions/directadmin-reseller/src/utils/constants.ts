import { getPreferenceValues } from "@raycast/api";

export const RESELLER_USERNAME = getPreferenceValues<Preferences>().reseller_username;
const RESELLER_PASSWORD = getPreferenceValues<Preferences>().reseller_password;
const TOKEN = btoa(`${RESELLER_USERNAME}:${RESELLER_PASSWORD}`);

const DIRECTADMIN_URL = getPreferenceValues<Preferences>().directadmin_url;
export const API_URL = new URL(DIRECTADMIN_URL);
export const API_HEADERS = {
    Authorization: `Basic ${TOKEN}`
}