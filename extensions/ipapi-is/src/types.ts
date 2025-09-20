type Datacenter = {
  datacenter: string;
  network: string;
  domain?: string;
  region?: string;
  service?: string;
  network_border_group?: string;
  code?: string;
  city?: string;
  state?: string;
  name?: string;
  country?: string;
};
enum CompanyOrAsnType {
  hosting = "hosting",
  education = "education",
  government = "government",
  banking = "banking",
  business = "business",
  isp = "isp",
}
type Company = {
  name: string;
  domain: string;
  type: CompanyOrAsnType;
  network: string;
  whois: string;
};
type ASN = {
  asn: number;
  descr: string;
  country: string;
  active: boolean;
  org: string;
  domain: string;
  abuse: string;
  type: CompanyOrAsnType;
  created: string;
  updated: string;
  rir: string;
  whois: string;
  route?: string;
};
type Location = {
  continent: string;
  country: string;
  country_code: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  zip: string;
  timezone: string;
  local_time: string;
  local_time_unix: number;
  is_dst: boolean;
  other?: string[];
};

type ASNRespones = ASN & {
  elapsed_ms: number;
  prefixes: string[];
  prefixesIPv6?: string[];
};
type IPResponse = {
  ip: string;
  rir: "AFRNIC" | "APNIC" | "ARIN" | "LACNIC" | "RIPE NCC";
  is_bogon: boolean;
  is_mobile: boolean;
  is_crawler: boolean;
  is_datacenter: boolean;
  is_tor: boolean;
  is_proxy: boolean;
  is_vpn: boolean;
  is_abuser: boolean;
  datacenter?: Datacenter;
  company?: Company;
  asn?: ASN;
  location?: Location;
  elapsed_ms: number;
};
export type SuccessResponse = IPResponse | ASNRespones;
export type ErrorResponse = {
  error: string;
  elapsed_ms: number;
};
