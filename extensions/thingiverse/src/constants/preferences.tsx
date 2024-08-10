import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const APIKEY = preferences.apiKey;
const BASEURL = "https://api.thingiverse.com";

export const ENDPOINTS = {
  SEARCH: `${BASEURL}/search/?type=things&page=1&per_page=70&sort=popular`,
  GETTHING: `${BASEURL}/things`,
};

export const HEADERS = {
  Authorization: `Bearer ${APIKEY}`,
  accept: "application/json",
};
