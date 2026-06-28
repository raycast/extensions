import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const APPTOKEN = preferences.appToken;
const BASEURL = "https://api.thingiverse.com";

export const ENDPOINTS = {
  SEARCH: `${BASEURL}/search/SEARCHTERM?`,
  GET_THING: `${BASEURL}/things`,
};

export const HEADERS = {
  Authorization: `Bearer ${APPTOKEN}`,
  accept: "application/json",
};
