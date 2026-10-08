export type SnapshotSource = "argument" | "active-tab";

export type SimilarwebResponse = Record<string, unknown>;

export type WebsiteSnapshot = {
  domain: string;
  fetchedAt: string;
  source: SnapshotSource;
  data: SimilarwebResponse;
};

export type ResolvedDomain = {
  domain: string;
  source: SnapshotSource;
};

export type DisplayRow = {
  label: string;
  value: string;
  details?: string;
};

export type NormalizedWebsiteData = {
  displayDomain: string;
  title?: string;
  description?: string;
  category?: string;
  globalRank?: number;
  countryRank?: number;
  countryCode?: string;
  categoryRank?: number;
  categoryName?: string;
  visits?: number;
  bounceRate?: number;
  pagesPerVisit?: number;
  timeOnSite?: number;
  monthlyVisits: DisplayRow[];
  trafficSources: DisplayRow[];
  topCountries: DisplayRow[];
  topKeywords: DisplayRow[];
  aiTraffic: DisplayRow[];
  rawFieldCount: number;
};

export type WebsiteSection = {
  key: string;
  title: string;
  subtitle?: string;
  markdown: string;
};
