export type Account = {
  billing_email: string | null;
  cancels_on: string | null;
  card_brand: string | null;
  company_details: string | null;
  company_name: string | null;
  company_vat: string | null;
  country: string | null;
  created: number;
  email: string;
  email_hash?: string;
  is_otp_enabled: boolean;
  last4: string | null;
  limits: {
    aliases: number;
    api: number;
    credentials: number;
    daily_quota: number;
    daily_send: number;
    destinations: number;
    domains: number;
    ratelimit: number;
    redirections: number;
    subdomains: number;
  };
  lock_reason: string | null;
  locked?: null;
  password: boolean;
  plan: {
    aliases_limit: number;
    daily_quota: number;
    display: string;
    domains_limit: number;
    kind: string;
    name: string;
    price: number;
    yearly: boolean;
  } | null;
  premium: boolean;
  privacy_level: number;
  renew_date: number;
};

export type Alias = {
  alias: string;
  created: number;
  forward: string;
  id: number;
};
export type Domain = {
  active: boolean;
  added: number;
  aliases: Alias[];
  banned: boolean;
  daily_quota?: number;
  display: string;
  dkim_selector: string;
  domain: string;
  notification_email: string | null;
  strict_mxes: boolean;
  webhook: null;
  whitelabel: null;
};

type DomainLogEvent = {
  code: number;
  created: number;
  id: string;
  local: string;
  message: string;
  recipient: {
    email: string;
    name: string | null;
  };
  server: string;
  status: "QUEUED" | "REFUSED" | "DELIVERED" | "SOFT-BOUNCE" | "HARD-BOUNCE";
};
export type DomainLog = {
  created: number;
  created_raw: number;
  events: DomainLogEvent[];
  forward: {
    email: string;
    name: string | null;
  };
  hostname: string;
  id: string;
  messageId: string;
  recipient: {
    email: string;
    name: string | null;
  };
  saved: boolean;
  sender: {
    email: string;
    name: string | null;
  };
  subject: string;
  transport: string;
  url: string;
};

export type ErrorResponse = {
  code: number;
  success: false;
} & ({ error: string; errors?: never } | { error?: never; errors: { [key: string]: string[] } });
