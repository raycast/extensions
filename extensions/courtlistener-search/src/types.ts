/** Shape of the CourtListener v4 search API responses we care about (`type=o`, i.e. case law). */

/** A single opinion inside a cluster. A cluster is one decision; it can hold several opinions. */
export interface OpinionResult {
  id: number;
  type: string;
  /** Excerpt of the opinion text. The passage that matched, in <mark> tags, with `highlight=on`. */
  snippet?: string;
  download_url?: string | null;
}

/** One row of `results`: an opinion cluster, i.e. a decision in a single case. */
export interface SearchResult {
  cluster_id: number;
  /** Path on courtlistener.com, e.g. "/opinion/10307218/miranda-v-kennedy/". */
  absolute_url: string;
  caseName: string;
  caseNameFull?: string;
  /** Full court name, e.g. "Court of Appeals for the First Circuit". */
  court: string;
  /** Bluebook court abbreviation, e.g. "1st Cir.". */
  court_citation_string?: string;
  court_id: string;
  /** ISO date, e.g. "2025-01-03". Missing for a handful of old opinions. */
  dateFiled: string | null;
  dateArgued?: string | null;
  /** Authoring judge's surname, when the source recorded one. Often empty. */
  judge?: string;
  panel_names?: string[];
  suitNature?: string;
  docketNumber?: string | null;
  /** Parallel citations, e.g. ["125 F.4th 23"]. Often empty for unreported cases. */
  citation?: string[];
  citeCount?: number;
  status?: string;
  /** The court's own summary of the case, where it filed one. Often a list of topics instead. */
  syllabus?: string;
  opinions?: OpinionResult[];
}

export interface SearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResult[];
}

/**
 * How a query was interpreted. "text" is CourtListener's keyword engine, "semantic" its Citegeist
 * embedding search — the same endpoint, `semantic=true` — and "citation" the separate lookup.
 */
export type SearchMode = "text" | "semantic" | "citation";

/** One past search, kept in LocalStorage so the landing page can offer it again. */
export interface HistoryEntry {
  query: string;
  /** Absent on entries stored before citation lookup existed; treat as "text". */
  mode?: SearchMode;
  /** Epoch milliseconds of the most recent time this query was run. */
  searchedAt: number;
  /** Total hits CourtListener reported, not the number of rows shown. */
  resultCount: number;
}

/** A case the user deliberately kept. Denormalised so the landing page needs no request. */
export interface SavedCase {
  clusterId: number;
  caseName: string;
  court: string;
  /** ISO date, or null where CourtListener has none. */
  dateFiled: string | null;
  /** First reported citation, when the case has one. */
  citation?: string;
  /** Path on courtlistener.com. */
  absoluteUrl: string;
  savedAt: number;
}

/** One case as the citation lookup returns it: a cluster object, not a search result. */
export interface CitationCluster {
  id: number;
  case_name?: string;
  /** Documented as present on clusters, but the schema isn't published — read defensively. */
  absolute_url?: string;
  date_filed?: string | null;
  citations?: { volume?: number; reporter?: string; page?: string; type?: number }[];
  docket_number?: string | null;
  judges?: string | null;
  precedential_status?: string;
  citation_count?: number;
}

/** One citation found in the submitted text. */
export interface CitationLookup {
  citation: string;
  /** Canonical forms, corrected by CourtListener's parser. */
  normalized_citations?: string[];
  /** 200 matched, 300 matched several, 404 no such case, 400 not a real reporter. */
  status: number;
  error_message?: string;
  clusters: CitationCluster[];
}

/** One row of `/api-usage/`: what's left in a single throttle scope. */
export interface UsageScope {
  /** Which throttle this row belongs to: "user" covers search, "citations" the citation lookup. */
  scope: string;
  /** The limit in force, e.g. "5/minute". One row per rate, so a scope appears several times. */
  rate: string;
  used: number;
  limit: number;
  remaining: number;
  window_seconds: number;
  /** When this window next admits a request. Null while it has room, and for a 0/… rate. */
  reset_at: string | null;
  /** The rate is zero — this token has no access to the scope at all. Not "currently throttled". */
  blocked: boolean;
}

export interface ApiUsage {
  current_usage: UsageScope[];
  membership?: { name?: string | null } | string | null;
}
