import { getPreferenceValues } from "@raycast/api";

// export const USER_SECURITY_LEVELS = ["HIGH", "LOW"];
export const FIREWALL_RULE_PROTOCOLS = ["tcp", "udp"];

export const ADMIN_USER = getPreferenceValues<Preferences>().adminUser;
const ADMIN_PASS = getPreferenceValues<Preferences>().adminPass;
const TOKEN = btoa(`${ADMIN_USER}:${ADMIN_PASS}`);

const PANEL_URL = getPreferenceValues<Preferences>().panelUrl;
export const API_URL = PANEL_URL + "cloudAPI/";
export const API_HEADERS = {
    "Authorization": `Basic ${TOKEN}`
};