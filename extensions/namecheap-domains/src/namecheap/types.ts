export type NamecheapEnvironment = "production" | "sandbox";

export interface NamecheapConfig {
  /** API username. Usually the same as the account username. */
  apiUser: string;
  apiKey: string;
  /** Account username the command runs against. Defaults to `apiUser`. */
  userName?: string;
  /** Whitelisted public IPv4 address. */
  clientIp: string;
  sandbox?: boolean;
}

export type DomainListType = "ALL" | "EXPIRING" | "EXPIRED";

export type DomainSortBy = "NAME" | "NAME_DESC" | "EXPIREDATE" | "EXPIREDATE_DESC" | "CREATEDATE" | "CREATEDATE_DESC";

export interface Domain {
  id: string;
  name: string;
  user: string;
  /** ISO date (YYYY-MM-DD), or null when Namecheap returned nothing parseable. */
  created: string | null;
  /** ISO date (YYYY-MM-DD), or null when Namecheap returned nothing parseable. */
  expires: string | null;
  isExpired: boolean;
  isLocked: boolean;
  autoRenew: boolean;
  /** Domain privacy status as reported by Namecheap: ENABLED, DISABLED or NOTPRESENT. */
  whoisGuard: string;
  isPremium: boolean;
  /** True when the domain uses Namecheap BasicDNS or PremiumDNS. */
  isOurDns: boolean;
}

export interface DomainListPage {
  domains: Domain[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
}

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  /** 0 when the check succeeded, otherwise a Namecheap error number explained by `description`. */
  errorNo: number;
  description: string;
  isPremium: boolean;
  premiumRegistrationPrice: number;
  premiumRenewalPrice: number;
  icannFee: number;
  eapFee: number;
}

export interface TldPricing {
  tld: string;
  currency: string;
  /** Final price by registration duration in years (Namecheap's `Price`). */
  byYears: Record<number, number>;
  /** Regular, non-promotional price by duration in years. */
  regularByYears: Record<number, number>;
}

/** Lowercase TLD (e.g. "com" or "co.uk") → pricing. A plain object so it survives JSON caching. */
export type PricingTable = Record<string, TldPricing>;

/** An <Error> element: an object when it carries attributes, a bare string when it does not. */
export type RawError = string | { "#text"?: string; Number?: string };

export interface RawApiResponse {
  ApiResponse?: {
    Status?: string;
    Errors?: { Error?: RawError[] } | string;
    RequestedCommand?: string;
    CommandResponse?: Record<string, unknown>;
  };
}
