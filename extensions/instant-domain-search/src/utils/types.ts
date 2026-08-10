// Domain availability status
export type DomainAvailability = "aftermarket" | "taken" | "available";

// Aftermarket pricing information
export interface AftermarketInfo {
  current_price?: number;
  lowest_bid?: number;
  currency: string;
  market: string;
}

// Base domain result structure (used by main domain, alternate extensions, and suggestions)
export interface DomainResult {
  domain: string;
  tld: string;
  availability: DomainAvailability;
  aftermarket: AftermarketInfo | null;
  backlink: string;
}

// Aftermarket domain structure (different from regular domain results)
export interface AftermarketDomain {
  domain: string;
  tld: string;
  availability: DomainAvailability;
  current_price: number;
  currency: string;
  market: string;
  info: AftermarketInfo;
  backlink: string;
}

// /domain/{domain} API response structure
export type DomainSearchResponse = DomainResult & {
  alternate_extensions: DomainResult[];
  suggestions: DomainResult[];
  aftermarket_domains: AftermarketDomain[];
};

// /bulk-check API response structure
export interface BulkCheckResponse {
  results: DomainResult[];
}
