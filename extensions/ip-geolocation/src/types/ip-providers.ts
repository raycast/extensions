export interface ProviderResult {
  provider: string;
  url: string;
  ok: boolean;
  error?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  asn?: string;
}

export interface ProviderSummary {
  countryCode?: string;
  country?: string;
  agreeing: number;
  responding: number;
  disagree: boolean;
}

export interface CompareProvidersData {
  ip: string;
  results: ProviderResult[];
  summary: ProviderSummary;
}
