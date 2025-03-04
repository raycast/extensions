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

export const MINIMUM_TTL = 600;

export const DEFAULT_NAMESERVERS = [
  "curitiba.ns.porkbun.com",
  "fortaleza.ns.porkbun.com",
  "maceio.ns.porkbun.com",
  "salvador.ns.porkbun.com",
];

export const URL_FORWARDING_TYPES = [
  {
    title: "Temporary Redirect (302 / 307)",
    value: "temporary",
    description:
      "A temporary redirect is used to tell web browsers and other clients that the current request should go to the new URL but any future request should still go to the original URL. You should probably use this one.",
  },
  {
    title: "Permanent Redirect (301)",
    value: "permanent",
    description:
      "A permanent redirect is used to tell web browsers and other clients that all future requests for the URL should go to the new URL. This is meant to be permanent; only use it if you are certain you will not want to redirect or use the URL in another way in the future.",
  },
  {
    title: "Masked",
    value: "masked",
    description:
      "A masked redirect will load the remote URL in a frame. This will allow the new domain to remain in the address bar of the user's web browser. However; the user will not be able to bookmark other pages of the site and have them function as expected. Masked URL forwarding may also have negative effects on SEO.",
  },
];

const FORCE_IPV4 = getPreferenceValues<Preferences>().force_ipv4;
const API_DOMAIN = FORCE_IPV4 ? "api-ipv4.porkbun.com" : "api.porkbun.com";
export const API_URL = `https://${API_DOMAIN}/api/json/v3/`;
export const API_KEY = getPreferenceValues<Preferences>().api_key;
export const SECRET_API_KEY = getPreferenceValues<Preferences>().secret_api_key;
export const API_HEADERS = {
  "Content-Type": "application/json",
};
export const API_METHOD = "POST";

export const API_DOCS_URL = "https://porkbun.com/api/json/v3/documentation#";
export const TLD_SVG_BASE_URL = "https://porkbun-media.s3-us-west-2.amazonaws.com/tld-buns/_";
