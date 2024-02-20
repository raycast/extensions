import { getPreferenceValues } from "@raycast/api";

const domain = getPreferenceValues<Preferences>().domain;
export const API_DOMAIN = domain.slice(-1) === "/" ? domain : domain + "/";
export const API_URL = API_DOMAIN + "api/v1/";

export const API_TOKEN = getPreferenceValues<Preferences>().api_token;
