export interface ApiResponse<T> {
  data: T;
  domain?: string;
  url?: string;
  total?: number;
  limit?: number;
  offset?: number;
  credits_used: number;
  credits_remaining: number;
  crawl_release?: string;
  cached?: boolean;
  partial?: boolean;
  [key: string]: unknown;
}

export interface BacklinkRow {
  from_domain: string;
  from_url: string;
  to_url: string;
  anchor_text: string | null;
  rel?: string | null;
  link_type: string;
  domain_host_count?: number | null;
  crawled_at: string;
  from_domain_score?: number;
  anchor_type?: string;
  link_quality?: string;
}

export interface ReferringDomainRow {
  from_domain: string;
  dofollow_links: number;
  nofollow_links: number;
  total_links: number;
  from_domain_score?: number;
}

export interface OutboundLinkRow {
  to_url: string;
  to_domain: string;
  anchor_text: string | null;
  link_type: string;
  edge_count: number;
}

export interface OutboundSummary {
  unique_destinations: number;
  top_domain: string | null;
  top_domain_concentration: number;
}

export interface AnchorTextRow {
  anchor_text: string;
  link_count: number;
  domain_count: number;
}

export interface TopPageRow {
  url: string;
  inbound_links: number;
  referring_domains: number;
  status_code?: number | null;
  mime?: string | null;
}

export interface DomainAuthorityData {
  score: number;
  referring_domains: number;
  total_host_count: number;
  registered_at: string | null;
  registrar: string | null;
  popularity_rank: number | null;
  health_score: number;
  risk_flags: string[];
}

export interface DomainRankData {
  inbound_edges: number;
  unique_domains: number;
  avg_linking_host_count: number;
}

export interface CrawlHistoryData {
  domain?: string;
  first_seen: string | null;
  last_seen: string | null;
  total_snapshots: number;
  source: string;
}

export interface DomainOverlapRow {
  from_domain: string;
  total_links: number;
  targets_linked: number;
}

export interface LinkIntersectRow {
  from_domain: string;
  total_links: number;
}

export interface CompetitorGapRow {
  from_domain: string;
  total_links: number;
  from_domain_score: number;
}

export interface SimilarDomainRow {
  similar_domain: string;
  shared_linkers: number;
}

export interface LinkAuditQuality {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface LinkAuditData {
  health_score: number;
  risk_flags: string[];
  link_quality: LinkAuditQuality;
  anchor_profile: Record<string, number>;
  top_backlinks: Array<{
    from_domain: string;
    from_domain_score: number;
    anchor_type: string;
    link_quality: string;
  }>;
  risk_backlinks: Array<{
    from_domain: string;
    from_domain_score: number;
    anchor_type: string;
    link_quality: string;
  }>;
  outbound_summary: OutboundSummary;
}

export interface SiteExplorerData {
  backlinks: BacklinkRow[];
  backlinks_total: number;
  authority: DomainAuthorityData;
  top_pages: TopPageRow[];
  anchor_text: AnchorTextRow[];
}

export interface PageSeoData {
  url: string;
  final_url?: string;
  status_code: number;
  response_time_ms?: number;
  title?: { text: string | null; length: number; optimal: boolean };
  description?: { text: string | null; length: number; optimal: boolean };
  canonical?: { url: string | null; self_referential: boolean | null };
  robots?: { index: boolean; follow: boolean; raw: string | null };
  viewport?: string | null;
  language?: { primary: string | null; tag: string | null; source: string | null };
  hreflang?: Array<{ lang: string; url: string }>;
  headings?: { h1: string[]; h2: string[]; h3_count: number };
  og?: {
    title?: string | null;
    description?: string | null;
    image?: string | null;
    type?: string | null;
    url?: string | null;
  };
  twitter?: { card?: string | null; title?: string | null };
  json_ld?: unknown[];
  images?: { total: number; missing_alt: number };
  links?: { internal: number; external: number };
  word_count?: number;
  favicon?: string | null;
}

export interface PagePerformanceData {
  url: string;
  performance_score: number | null;
  accessibility_score: number | null;
  seo_score: number | null;
  core_web_vitals: {
    lcp_ms: number | null;
    cls: number | null;
    inp_ms: number | null;
    fcp_ms: number | null;
    ttfb_ms: number | null;
  };
  crux_data?: boolean;
  strategy: string;
  cached_at: string;
}

export interface TechEntry {
  name: string;
  category: string;
  confidence: string;
}

export interface TechStackData {
  domain: string;
  technologies: TechEntry[];
  server: string | null;
  x_powered_by: string | null;
  response_time_ms: number;
}

export interface SiteHealthCheck {
  url: string;
  status: number | null;
  content_type: string | null;
  response_time_ms: number | null;
}

export interface SiteHealthData {
  domain: string;
  https: { enforced: boolean; hsts: boolean; hsts_max_age: number | null };
  www_redirect: { enabled: boolean; target: string | null };
  checks: SiteHealthCheck[];
  security_headers: {
    x_frame_options: string | null;
    x_content_type_options: string | null;
    content_security_policy: boolean;
    strict_transport_security: string | null;
    referrer_policy: string | null;
  };
  robots_txt: { present: boolean; disallow_all: boolean; sitemap_declared: boolean };
}

export interface SitemapEntry {
  url: string;
  lastmod?: string | null;
  changefreq?: string | null;
  priority?: string | null;
}

export interface SitemapResponse extends ApiResponse<SitemapEntry[]> {
  sitemap_url?: string | null;
  sitemap_type?: string;
  child_sitemaps?: string[];
  source?: string;
}

export interface UsageEntry {
  endpoint: string;
  credits_used: number;
  created_at: string | number;
  domain?: string | null;
  url?: string | null;
}

export interface UsageResponse {
  usage: UsageEntry[];
  total: number;
}

export interface CreditsResponse {
  credits: number;
}

export interface BatchResultItem {
  domain: string;
  data?: BacklinkRow[];
  total?: number;
  success: boolean;
  error?: string;
}
