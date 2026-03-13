// ALIASES
export type Alias = {
  from: string;
  to: string;
};
export type AliasCreate = Alias;
export type AliasCreateResponse = {
  id: number;
  status: string;
} & Alias;
export type FormAliasCreate = {
  local_part: string;
  destinations: string;
  is_internal: boolean;
  expireable: boolean;
  expires_on: Date | null;
  remove_upon_expiry: boolean;
};

// DOMAINS
export type DomainDelete = {
  domains: string[];
};

// EMAILS
export type Email = {
  id: number;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  status: "sent" | "spam" | "outgoing";
  body: string;
  htmlbody: string;
};

export type AliasEdit = {
  is_internal: boolean;
  destinations: string;
  expireable: boolean;
  expires_on: string | null;
  remove_upon_expiry: boolean;
};
export type FormAliasEdit = {
  is_internal: boolean;
  destinations: string;
  expireable: boolean;
  expires_on: Date | null;
  remove_upon_expiry: boolean;
};

export type BodyRequest = AliasCreate | AliasEdit | DomainDelete;
export type ErrorResponse = {
  errors: string;
};

export type APIMethod = "GET" | "POST" | "DELETE";
