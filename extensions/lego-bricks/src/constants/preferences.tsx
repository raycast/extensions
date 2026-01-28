import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const APIKEY = preferences.apiKey;
const REBRICKABLEBASEURL = "https://rebrickable.com/api/v3";

export const ENDPOINTS = {
  COLORS: `${REBRICKABLEBASEURL}/lego/colors/`,
  MINIFIGS: `${REBRICKABLEBASEURL}/lego/minifigs/`,
  SETS: `${REBRICKABLEBASEURL}/lego/sets/`,
  PARTS: `${REBRICKABLEBASEURL}/lego/parts/`,
  LATESTSETS: `${REBRICKABLEBASEURL}/lego/sets/?ordering=-year`,
};

export const HEADERS = {
  Authorization: `key ${APIKEY}`,
  Accept: "application/json",
};
