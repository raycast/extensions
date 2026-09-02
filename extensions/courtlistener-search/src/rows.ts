import { stripHighlights } from "./highlight";
import { CitationCluster, SavedCase, SearchResult } from "./types";

/**
 * Search results and citation-lookup clusters describe the same thing in different shapes, and
 * the list renders both. This is what the list actually needs.
 */
export interface CaseRow {
  /** Cluster id — stable across both sources, and what a saved case is keyed on. */
  id: number;
  caseName: string;
  /** Empty for citation lookups: a cluster reaches its court through the docket, which isn't in that response. */
  court: string;
  dateFiled: string | null;
  citations: string[];
  docketNumber?: string;
  judges?: string;
  status?: string;
  citeCount?: number;
  /** Only search results carry an excerpt; there are no query terms to highlight in a lookup. */
  snippet?: string;
  /** Raw syllabus; the detail pane decides whether it reads as a summary or a list of topics. */
  syllabus?: string;
  /** Path on courtlistener.com. */
  absoluteUrl: string;
}

export function rowFromSearchResult(result: SearchResult): CaseRow {
  return {
    id: result.cluster_id,
    caseName: stripHighlights(result.caseName) || "Untitled case",
    court: stripHighlights(result.court),
    dateFiled: result.dateFiled,
    citations: (result.citation ?? []).map(stripHighlights),
    docketNumber: result.docketNumber ? stripHighlights(result.docketNumber) : undefined,
    judges: stripHighlights(result.judge || (result.panel_names ?? []).join(", ")) || undefined,
    status: result.status,
    citeCount: result.citeCount,
    // A cluster can hold a majority and separate opinions; take the first that came back with text.
    snippet: result.opinions?.find((opinion) => opinion.snippet?.trim())?.snippet,
    syllabus: result.syllabus,
    absoluteUrl: result.absolute_url,
  };
}

/** Cluster citations arrive in parts. */
function formatCitation(citation: { volume?: number; reporter?: string; page?: string }): string {
  return [citation.volume, citation.reporter, citation.page].filter(Boolean).join(" ");
}

function slugify(caseName: string): string {
  return (
    caseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "case"
  );
}

export function rowFromCluster(cluster: CitationCluster): CaseRow {
  const caseName = cluster.case_name?.trim() || "Untitled case";

  return {
    id: cluster.id,
    caseName,
    court: "",
    dateFiled: cluster.date_filed ?? null,
    citations: (cluster.citations ?? []).map(formatCitation).filter(Boolean),
    docketNumber: cluster.docket_number ?? undefined,
    judges: cluster.judges ?? undefined,
    status: cluster.precedential_status,
    citeCount: cluster.citation_count,
    // The cluster schema isn't published, so absolute_url may not be there; opinion URLs are
    // built from the cluster id and a slug of the case name.
    absoluteUrl: cluster.absolute_url ?? `/opinion/${cluster.id}/${slugify(caseName)}/`,
  };
}

export function savedCaseFromRow(row: CaseRow): SavedCase {
  return {
    clusterId: row.id,
    caseName: row.caseName,
    court: row.court,
    dateFiled: row.dateFiled,
    citation: row.citations[0],
    absoluteUrl: row.absoluteUrl,
    savedAt: Date.now(),
  };
}
