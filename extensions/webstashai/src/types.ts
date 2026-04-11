/**
 * TypeScript interfaces derived from shared/contracts/webstash.ts.
 * Only types needed by the Raycast extension are included here.
 */

export type ItemType =
  | "article"
  | "webpage"
  | "pdf"
  | "image"
  | "tweet"
  | "github";

export interface Page {
  id: string;
  url: string;
  title: string;
  domain: string;
  item_type?: ItemType;
  markdown: string | null;
  summary_what: string | null;
  summary_why: string | null;
  summary_how: string | null;
  meta_og_image: string | null;
  meta_favicon: string | null;
  tags: string | null;
  user_tags: string | null;
  primary_tag: string | null;
  secondary_tag: string | null;
  status: "processing" | "indexed" | "failed";
  error: string | null;
  saved_at: string;
  indexed_at: string | null;
  updated_at: string | null;
  is_alive: number;
  notes: string | null;
  is_favorite: number;
  is_pinned?: number;
  pinned_at?: string | null;
  thumbnail_key?: string | null;
  source?: string | null;
  webapp_url?: string;
}

export interface PagesListResponse {
  pages: Page[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  domain: string;
  item_type?: ItemType;
  summary: {
    summary: string | null;
    what: string | null;
    why: string | null;
    how: string | null;
  };
  tags: string | null;
  user_tags: string | null;
  primary_tag: string | null;
  secondary_tag: string | null;
  thumbnail_key: string | null;
  saved_at: string;
  score: number;
  source?: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
  };
}

export interface QuotaInfo {
  pages_used: number;
  pages_limit: number | null;
  ai_used: number;
  ai_limit: number | null;
}

export interface ApiErrorBody {
  error: string;
  quota?: number;
  limit?: number;
  used?: number;
  resetAt?: string;
  upgradeUrl?: string;
}

// ── Phase 2: Browse Library + Page Detail ─────────────────────

export interface ListPagesOptions {
  cursor?: string;
  limit?: number;
  status?: "processing" | "indexed" | "failed";
  domain?: string;
  tag?: string;
  is_favorite?: 0 | 1;
  is_pinned?: 0 | 1;
  after?: string;
  before?: string;
  q?: string;
}

export interface PageDetailResponse extends Page {
  tag_count: number;
  duplicate_count: number;
}

export interface RelatedPagesResponse {
  results: SearchResult[];
}

// ── Phase 4: Page Management Actions ──────────────────────────

export interface UpdatePageFields {
  is_favorite?: 0 | 1;
  is_pinned?: 0 | 1;
  title?: string;
}

export interface UpdatePageTagsRequest {
  tags: string[];
}

export interface PageNote {
  id: string;
  page_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface ReindexResponse {
  id: string;
  status: string;
}

// ── Phase 5: Highlights ─────────────────────────────────────────

export interface Highlight {
  id: string;
  page_id: string;
  user_id: string;
  text: string;
  text_prefix: string | null;
  text_suffix: string | null;
  note: string | null;
  css_selector: string | null;
  text_offset: number | null;
  text_length: number | null;
  source_url: string;
  tags: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface HighlightWithPage extends Highlight {
  page_title: string;
  page_domain: string;
  page_url: string;
  page_favicon: string | null;
  page_primary_tag: string | null;
}

export interface HighlightsListResponse {
  highlights: HighlightWithPage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CreateHighlightRequest {
  text: string;
  note?: string;
  source_url: string;
  tags?: string[];
}

// ── Phase 3: Save Page ──────────────────────────────────────────

export interface CheckPageResponse {
  exists: boolean;
  page?: {
    id: string;
    title: string;
    status: string;
    saved_at: string;
    primary_tag: string | null;
    secondary_tag: string | null;
  };
}

export interface SavePageResponse {
  id: string;
  status: "processing" | "indexed";
  title?: string;
  webapp_url?: string;
}

// ── Phase 6: Tags + Collections ──────────────────────────────

export interface TagIndexEntry {
  tag: string;
  count: number;
}

export interface TagIndexResponse {
  primary_tags: TagIndexEntry[];
  secondary_tags: TagIndexEntry[];
  user_tags: TagIndexEntry[];
}

export interface TagRenameRequest {
  old_tag: string;
  new_tag: string;
}

/** Synchronous rename/merge result (HTTP 200). */
export interface TagRenameResultSync {
  affected_pages: number;
  old_tag: string;
  new_tag: string;
  dry_run?: true;
  sample_ids?: string[];
}

/** Async rename/merge result (HTTP 202). */
export interface TagRenameResultAsync {
  job_id: string;
  status: "pending";
  affected_pages: number;
  old_tag: string;
  new_tag: string;
}

export type TagRenameResult = TagRenameResultSync | TagRenameResultAsync;

export interface TagJobResponse {
  id: string;
  operation: "rename" | "merge";
  old_tag: string;
  new_tag: string;
  status: "pending" | "processing" | "completed" | "failed";
  affected_pages: number;
  processed_pages: number;
  error: string | null;
}

export interface Collection {
  id: string;
  name: string;
  page_count?: number;
  is_auto?: number;
}

export interface CollectionsListResponse {
  collections: Collection[];
}

export interface CollectionPagesResponse {
  collection: { id: string; name: string };
  pages: Page[];
  has_more?: boolean;
  next_offset?: number;
}

// ── Phase 7: Review / Spaced Repetition ──────────────────────

export type ReviewFeedbackAction = "soon" | "later" | "someday" | "discard";
export type ReviewFrequency = "never" | "less" | "normal" | "more";

export interface ReviewHighlight extends HighlightWithPage {
  recall_probability: number | null;
  review_count: number;
  phase: "unreviewed" | "due";
}

export interface ReviewDeckResponse {
  highlights: ReviewHighlight[];
  deck_size: number;
  total_due: number;
  total_unreviewed: number;
}

export interface ReviewPreferences {
  deck_size: number;
  enabled: boolean;
}

export interface ReviewSource {
  id: string;
  title: string;
  domain: string;
  favicon: string | null;
  highlight_count: number;
  review_frequency: ReviewFrequency;
  meta_author: string | null;
  meta_og_image: string | null;
  last_highlighted_at: string | null;
  item_type: string;
  user_tags: string | null;
}

export interface ReviewSourceCounts {
  all: number;
  article: number;
  webpage: number;
  pdf: number;
  image: number;
  tweet: number;
  github: number;
}

export interface ReviewSourcesResponse {
  sources: ReviewSource[];
  next_cursor: string | null;
  has_more: boolean;
  counts: ReviewSourceCounts;
}

// ── Phase 9: Import ───────────────────────────────────────────

export interface ImportResponse {
  job_id: string | null;
  total: number;
  enqueued: number;
  skipped: number;
  skipped_quota: number;
  error?: string;
}

export interface ImportJobResponse {
  id: string;
  user_id: string;
  source_type: "html" | "csv";
  status: "pending" | "processing" | "completed" | "failed";
  total_urls: number;
  processed_urls: number;
  failed_urls: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  failed_items?: { url: string; title?: string; error: string }[];
}

// ── Phase 8: Synthesize + Stats ────────────────────────────────

export interface StatsResponse {
  total_pages: number;
  total_indexed: number;
  total_favorites: number;
  total_dead_links: number;
  pages_this_week: number;
  pages_this_month: number;
  top_domains: { domain: string; count: number }[];
  top_tags: { name: string; count: number }[];
  total_collections?: number;
  ai_queries?: number;
}

export interface SynthesizeRequest {
  query: string;
}

export interface SynthesizeResponse {
  synthesis: string;
  sources: { id: string; url: string; title: string }[];
}
