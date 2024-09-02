type Coupon = {
  code: string;
  max_per_user: number;
  first_year_only: string;
  type: string;
  amount: number;
};
export type DomainPricing = {
  [key: string]: {
    registration: string;
    renewal: string;
    transfer: string;
    coupons:
      | []
      | {
          registration?: Coupon;
          renewal?: Coupon;
          transfer?: Coupon;
        };
    specialType?: string;
  };
};

export enum DNSRecordType {
  A = "A",
  MX = "MX",
  CNAME = "CNAME",
  ALIAS = "ALIAS",
  TXT = "TXT",
  NS = "NS",
  AAAA = "AAAA",
  SRV = "SRV",
  TLSA = "TLSA",
}
export type CreateDNSRecordRequest = {
  name: string;
  type: DNSRecordType;
  content: string;
  ttl?: string;
  prio?: string;
};
export type EditDNSRecordByDomainSubdomainAndIdRequest = {
  content: string;
  ttl?: string;
  prio?: string;
};
export type RequestBody =
  | CreateDNSRecordRequest
  | EditDNSRecordByDomainSubdomainAndIdRequest
  | UpdateNameServersRequest
  | AddUrlForwardingRequest
  | RetrieveAllDomainsRequest;

export type ErrorResponse = {
  status: "ERROR";
  message: string;
  code?: string;
};
export type RetrieveSSLBundleResponse = {
  status: "SUCCESS";
  intermediatecertificate: string;
  certificatechain: string;
  privatekey: string;
  publickey: string;
};

export type DNSRecord = {
  id: string;
  name: string;
  type: DNSRecordType;
  content: string;
  ttl: string;
  prio: string | null;
  notes: string | null;
};
export type RetrieveDNSRecordsResponse = {
  status: "SUCCESS";
  cloudflare: "enabled" | "disabled";
  records: DNSRecord[];
};

type Label = {
  id: string;
  title: string;
  color: string;
};
export type Domain = {
  domain: string;
  status: string;
  tld: string;
  createDate: string;
  expireDate: string;
  securityLock: 0 | "1";
  whoisPrivacy: 0 | "1";
  autoRenew: 0 | "1";
  notLocal: 0 | "1";
  labels?: Label[];
};
type RetrieveAllDomainsRequest = {
  includeLabels: "yes";
};
export type RetrieveAllDomainsResponse = {
  status: "SUCCESS";
  domains: Domain[];
};

export type GetNameServersResponse = {
  status: "SUCCESS";
  ns: string[];
};
export type UpdateNameServersRequest = {
  ns: string[];
};

export type UrlForwarding = {
  id: string;
  subdomain: string;
  location: string;
  type: "temporary" | "permanent" | "masked";
  includePath: "yes" | "no";
  wildcard: "yes" | "no";
};
export type GetUrlForwardingResponse = {
  status: "SUCCESS";
  forwards: UrlForwarding[];
};
export type AddUrlForwardingRequest = {
  subdomain: string;
  location: string;
  type: "temporary" | "permanent" | "masked";
  includePath: "yes" | "no";
  wildcard: "yes" | "no";
};

export type SuccessResponse = {
  status: "SUCCESS";
  pricing?: DomainPricing;
  yourIp?: string;
  id?: number;
};
export type Response = ErrorResponse | SuccessResponse;
