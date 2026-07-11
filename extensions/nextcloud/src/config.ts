import { environment, getPreferenceValues } from "@raycast/api";

const { hostname, username, password } = getPreferenceValues<Preferences>();
const cleanHost = hostname.endsWith("/") ? hostname.slice(0, -1) : hostname;
export const BASE_URL = cleanHost.startsWith("http") ? cleanHost : `https://${cleanHost}`;
export const API_HEADERS = {
  Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
  "User-Agent": `Raycast/${environment.raycastVersion}`,
};
