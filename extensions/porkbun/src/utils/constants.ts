import { getPreferenceValues } from "@raycast/api";

export const DNS_RECORD_TYPES = [
  { type: "A", description: "Address record", hasPriority: false },
  { type: "MX", description: "Mail exchange record", hasPriority: true },
  { type: "CNAME", description: "Canonical name record", hasPriority: false },
  { type: "ALIAS", description: "CNAME flattening record", hasPriority: false },
  { type: "TXT", description: "Text record", hasPriority: false },
  { type: "NS", description: "Name server record", hasPriority: false },
  { type: "AAAA", description: "IPv6 address record", hasPriority: false },
  { type: "SRV", description: "Service record", hasPriority: true },
  { type: "TLSA", description: "TLS Authentication Record", hasPriority: false },
  { type: "CAA", description: "Certification Authority Authorization", hasPriority: false },
];

export const DEFAULT_NAMESERVERS = [
  "curitiba.ns.porkbun.com",
  "fortaleza.ns.porkbun.com",
  "maceio.ns.porkbun.com",
  "salvador.ns.porkbun.com"
]

const FORCE_IPV4 = getPreferenceValues<Preferences>().force_ipv4;
const API_DOMAIN = FORCE_IPV4 ? "api-ipv4.porkbun.com" : "porkbun.com";
export const API_URL = `https://${API_DOMAIN}/api/json/v3/`;
export const API_KEY = getPreferenceValues<Preferences>().api_key;
export const SECRET_API_KEY = getPreferenceValues<Preferences>().secret_api_key;
export const API_HEADERS = {
  "Content-Type": "application/json",
};

export const API_DOCS_URL = "https://porkbun.com/api/json/v3/documentation#";