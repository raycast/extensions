import { getPreferenceValues } from "@raycast/api";

export const HOSTNAME = getPreferenceValues<Preferences>().hostname;
export const USERNAME = getPreferenceValues<Preferences>().username;
export const ACCESS_KEY = getPreferenceValues<Preferences>().access_key;
export const SECRET_KEY = getPreferenceValues<Preferences>().secret_key;

export const DB_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const USER_ACCESS_LOG_FILTERS = {
  levels: ["info", "warning", "error"],
  categories: [
    "web",
    "dns",
    "mail",
    "db",
    "letsencrypt",
    "pwchange",
    "pwreset", //user
    "ip",
    "firewall",
    "service",
    "updates", //system
    "users",
    "pwchange",
    "pwreset",
    "impersonation",
  ],
};

export const DOMAIN_LOG_LINES = "70";
