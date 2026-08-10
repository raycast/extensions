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

export const DNS_RECORD_TYPES = {
  A: "IPV4 Address",
  AAAA: "IPV6 Address",
  CNAME: "Target Hostname",
  MX: "Target Hostname",
  TXT: "Text",
  SRV: "X:Y:Z format, where X - weight, Y - port and Z - target",
  CAA: "X:Y:Z format, where X - flag, Y - tag and Z - value",
};
