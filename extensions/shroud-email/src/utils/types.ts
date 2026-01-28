export type TokenRequest = {
  email: string;
  password: string;
  totp?: number;
};
export type TokenResponse = {
  token: string;
};

type PageOptionsParameters = {
  page_size: string;
  page: string;
};

export type DomainsRequestParameters = PageOptionsParameters;
type Domain = {
  domain: string;
};
export type DomainsResponse = {
  domains: Domain[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
};

export type AliasesRequestParameters = PageOptionsParameters;
export type Alias = {
  address: string;
  enabled: boolean;
  title: string;
  notes: string;
  forwarded: number;
  blocked: number;
  blocked_addresses: string[];
};
export type AliasesResponse = {
  email_aliases: Alias[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
};
export type AliasesCreateRequest = {
  local_part?: string;
  domain?: string;
};

export type ErrorResponseObject = { error: string };
export type ErrorResponse = string | ErrorResponseObject;

export type BodyRequest = TokenRequest | AliasesCreateRequest;

export type APIMethod = "GET" | "POST";
export type APIHeaders = {
  Accept: "application/json";
  "Content-Type": "application/json";
  Authorization?: string;
};
