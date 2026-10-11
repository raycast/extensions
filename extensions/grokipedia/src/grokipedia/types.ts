export interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
  viewCount?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount?: number;
}

export interface Citation {
  id: string;
  title: string;
  description: string;
  url: string;
  favicon: string;
}

export interface PageStats {
  viewCount?: number;
}

export interface Page {
  slug: string;
  title: string;
  content: string;
  description: string;
  citations: Citation[];
  images: unknown[];
  fixedIssues: unknown[];
  metadata: Record<string, unknown>;
  stats: PageStats;
  linkedPages: unknown[];
}

export type PageResponse = { found: true; page: Page } | { found: false; page: null };

export interface ConstantsResponse {
  accountUrl: string;
  grokComUrl: string;
  appEnv: string;
}

export interface StatsResponse {
  totalPages: string;
  totalViews: number;
  avgViewsPerPage: number;
  indexSizeBytes: string;
  statsTimestamp: string;
}
