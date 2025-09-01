import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.manotori.com/v1/";
const { api_token } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${api_token}`,
};

export const DNS_RECORD_TYPE_TO_PLACEHOLDER: Record<string, string> = {
  A: "192.168.178.101",
AAAA: "2001:db8::1324:5876",
CNAME: "blog.example.com",
MX: "mail.example.com",
NS: "ns.example.com",
SOA: "",
SRV: "",
TXT: ""
}