import { getPreferenceValues } from "@raycast/api";

const prefs = getPreferenceValues<Preferences.Index>();
export const BASE_URL =
  prefs.server_region === "standard"
    ? "https://mixpanel.com"
    : prefs.server_region === "eu"
      ? "https://eu.mixpanel.com"
      : "https://in.mixpanel.com";
const token = Buffer.from(`${prefs.service_account}:${prefs.service_account_secret}`).toString("base64");
export const API_HEADERS = {
  accept: "application/json",
  "content-type": "application/x-www-form-urlencoded",
  authorization: `Basic ${token}`,
};
