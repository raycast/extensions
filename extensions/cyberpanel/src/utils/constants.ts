import crypto from "crypto";
import { getPreferenceValues } from "@raycast/api";

export const DNS_RECORD_TYPES = [
  { type: "A", hasPriority: false, hasName: true, contentPlaceholder: "IP Address" },
  { type: "AAAA", hasPriority: false, hasName: true, contentPlaceholder: "IPV6 Address" },
  { type: "CNAME", hasPriority: false, hasName: true, contentPlaceholder: "Domain Name" },
  { type: "MX", hasPriority: true, hasName: true, contentPlaceholder: "Domain Name" },
  { type: "TXT", hasPriority: false, hasName: true, contentPlaceholder: "Text" },
  { type: "SPF", hasPriority: false, hasName: true, contentPlaceholder: "Policy" },
  { type: "NS", hasPriority: false, hasName: false, contentPlaceholder: "Name Server" },
  { type: "SOA", hasPriority: false, hasName: false, contentPlaceholder: "SOA Value" },
  { type: "SRV", hasPriority: false, hasName: true, contentPlaceholder: "Content" },
  { type: "CAA", hasPriority: false, hasName: true, contentPlaceholder: '0 issue "letsencrypt.org"' },
];

export const DEFAULT_PAGE_FOR_WEBSITES = 1;

export const AVAILABLE_PHP_VERSIONS_FOR_WEBSITES = ["PHP 7.1", "PHP 7.2", "PHP 7.3", "PHP 7.4", "PHP 8.0", "PHP 8.1"];

export const ADMIN_USER = getPreferenceValues<Preferences>().adminUser;
const ADMIN_PASS = getPreferenceValues<Preferences>().adminPass;
const { tokenType } = getPreferenceValues<Preferences>();
const TOKEN =
  tokenType === "base64"
    ? btoa(`${ADMIN_USER}:${ADMIN_PASS}`)
    : crypto.createHash("sha256").update(`${ADMIN_USER}:${ADMIN_PASS}`).digest("hex");

export const PANEL_URL = new URL(getPreferenceValues<Preferences>().panelUrl);
export const API_URL = PANEL_URL + "cloudAPI/";
export const API_HEADERS = {
  Authorization: `Basic ${TOKEN}`,
};
export const DEFAULT_API_BODY_SERVER_USER_NAME = "admin";
