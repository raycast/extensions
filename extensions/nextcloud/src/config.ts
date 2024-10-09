import { environment, getPreferenceValues } from "@raycast/api";

const { hostname, username, password } = getPreferenceValues<Preferences>();
export const BASE_URL = `https://${hostname}`;
export const API_HEADERS = {
  Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
  "User-Agent": `Raycast/${environment.raycastVersion}`,
};
