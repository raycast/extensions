import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

const APIKEY = preferences.apiKey;
const BASEURL = "https://api.synsbasen.dk";

export const ENDPOINTS = {
  SEARCH_VEHICLE_BY_LICENSE_PLATE: `${BASEURL}/v1/vehicles/registration/:registration`,
  SEARCH_VEHICLE_BY_VIN: `${BASEURL}/v1/vehicles/vin/:vin`,
};

export const HEADERS = {
  Authorization: `Bearer ${APIKEY}`,
};
