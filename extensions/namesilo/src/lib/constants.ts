import { getPreferenceValues } from "@raycast/api";

const { api_key, ote_api_key = "", use_ote } = getPreferenceValues<Preferences>();
export const API_BASE_URL = use_ote ? "https://ote.namesilo.com/" : "https://www.namesilo.com/";
export const API_PARAMS = {
  version: "1",
  type: "json",
  key: use_ote ? ote_api_key : api_key,
};

export const NAMESILO_LINKS = {
  search: "https://www.namesilo.com/domain/search-domains",
};
export const NAMESILO_IMAGE = "namesilo.png";
