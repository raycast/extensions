export type RawTypeaheadItem = {
  titleHighlights: unknown[];
  snippetHighlights: unknown[];
  slug: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  viewCount: string;
};

export type TypeaheadResponse = {
  results: RawTypeaheadItem[];
  searchTimeMs: number;
};

export type RawSearchItem = RawTypeaheadItem;

export type FullTextSearchResponse = {
  results: RawSearchItem[];
  facets: unknown[];
  totalCount: number;
  searchTimeMs: number;
};

export type StatsResponseRaw = {
  totalPages: string | number;
  totalViews: string | number;
  avgViewsPerPage: string | number;
  indexSizeBytes: string | number;
  statsTimestamp: string | number;
};

export type Stats = {
  totalPages: number;
  totalViews: number;
  avgViewsPerPage: number;
  indexSizeBytes: number;
  statsTimestamp: number;
  raw?: StatsResponseRaw;
};

export type Citation = {
  id?: string;
  title?: string;
  description?: string;
  url?: string;
  favicon?: string;
};

export type PageMetadata = {
  categories: string[];
  lastModified: string;
  contentLength: string;
  version: string;
  lastEditor: string;
  language: string;
  isRedirect: boolean;
  redirectTarget: string;
  isWithheld: boolean;
};

export type PageStats = {
  totalViews: string;
  recentViews: string;
  dailyAvgViews: number;
  qualityScore: number;
  lastViewed: string;
};

export type PageResponse = {
  page: {
    citations: Citation[];
    images: unknown[];
    fixedIssues: unknown[];
    slug: string;
    title: string;
    content: string;
    description: string;
    metadata: PageMetadata;
    stats: PageStats;
    linkedPages: { indexedSlugs: string[]; unindexedSlugs: string[] };
  };
  found: boolean;
};
