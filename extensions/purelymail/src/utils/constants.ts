import { getPreferenceValues } from "@raycast/api";

const API_TOKEN = getPreferenceValues<Preferences>().api_token;
export const API_URL = "https://purelymail.com/api/v0/";
export const API_METHOD = "POST";
export const API_HEADERS = {
  "Content-Type": "application/json",
  "Purelymail-Api-Token": API_TOKEN,
};

export const REQUIRED_OWNERSHIP_DNS_RECORDS = [
  { type: "MX", host: "", value: "mailserver.purelymail.com." },
  { type: "TXT", host: "", value: "v=spf1 include:_spf.purelymail.com ~all" },
];
export const OPTIONAL_OWNERSHIP_DNS_RECORDS = [
  { type: "CNAME", host: "purelymail1._domainkey", value: "key1.dkimroot.purelymail.com." },
  { type: "CNAME", host: "purelymail2._domainkey", value: "key2.dkimroot.purelymail.com." },
  { type: "CNAME", host: "purelymail3._domainkey", value: "key3.dkimroot.purelymail.com." },
  { type: "CNAME", host: "_dmarc", value: "dmarcroot.purelymail.com." },
];

export const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
