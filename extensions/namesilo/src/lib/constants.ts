import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://www.namesilo.com/api/";
const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_PARAMS = {
  version: "1",
  type: "json",
  key: API_KEY,
};

export const NAMESILO_LINKS = {
  search: "https://www.namesilo.com/domain/search-domains",
};
