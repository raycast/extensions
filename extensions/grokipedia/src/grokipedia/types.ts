export interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  viewCount: number;
  titleHighlights: unknown[];
  snippetHighlights: unknown[];
}

export interface SearchResponse {
  results: SearchResult[];
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
  metadata: object;
  stats: PageStats;
  linkedPages: unknown[];
}

export interface PageResponse {
  page: Page | null;
  found: boolean;
}

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
