import { environment, getPreferenceValues } from "@raycast/api";

const { hostname, username, password } = getPreferenceValues<Preferences>();
export const BASE_URL = `https://${hostname}`;
const API_BASE_URL = `https://${hostname}/`;
export const API_URL = {
    ocs: API_BASE_URL + "/ocs/v2.php"
}
export const API_HEADERS = {
    Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
    "User-Agent": `Raycast/${environment.raycastVersion}`,
}