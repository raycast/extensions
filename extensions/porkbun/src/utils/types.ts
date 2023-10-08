export type Preferences = {
  api_key: string;
  secret_api_key: string;
};

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
export type RequestBody = CreateDNSRecordRequest | EditDNSRecordByDomainSubdomainAndIdRequest;

export type ErrorResponse = {
  status: "ERROR";
  message: string;
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
export type SuccessResponse = {
  status: "SUCCESS";
  pricing?: DomainPricing;
  yourIp?: string;
  id?: number;
};
export type Response = ErrorResponse | SuccessResponse;
