import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type SemanticScholarPaper = {
  paperId: string;
  externalIds?: {
    DOI?: string;
    PubMed?: string;
    PubMedCentral?: string;
    ArXiv?: string;
    CorpusId?: number;
  };
  url?: string;
  title?: string;
  abstract?: string;
  venue?: string;
  year?: number;
  authors?: Array<{ name?: string }>;
  isOpenAccess?: boolean;
  openAccessPdf?: { url?: string; status?: string; license?: string } | null;
};

type SemanticScholarSearchResponse = { data?: SemanticScholarPaper[] };

const FIELDS = [
  "title",
  "authors",
  "year",
  "venue",
  "externalIds",
  "url",
  "isOpenAccess",
  "openAccessPdf",
  "abstract",
].join(",");

export const semanticScholarProvider: SearchProvider = {
  id: "semantic-scholar",
  name: "Semantic Scholar",
  async search(query, context) {
    if (!context.semanticScholarApiKey)
      throw new Error("Set Semantic Scholar API Key in extension preferences.");
    const parsed = parseQuery(query);
    const headers = { "x-api-key": context.semanticScholarApiKey };

    if (parsed.doi) {
      const paper = await fetchJson<SemanticScholarPaper>(
        `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(`DOI:${parsed.doi}`)}?fields=${FIELDS}`,
        context.signal,
        headers,
      );
      return [mapPaper(paper)];
    }

    const advanced = context.advanced;
    const params = new URLSearchParams({
      query: advanced
        ? [advanced.title, advanced.authors, advanced.journal, advanced.general]
            .filter(Boolean)
            .join(" ")
        : parsed.raw,
      limit: "10",
      fields: FIELDS,
    });
    if (advanced?.yearFrom || advanced?.yearTo)
      params.set("year", `${advanced.yearFrom ?? ""}-${advanced.yearTo ?? ""}`);
    if (advanced?.openAccessOnly) params.set("openAccessPdf", "");
    if (advanced?.journal) params.set("venue", advanced.journal);
    if (advanced?.kind === "book")
      params.set("publicationTypes", "Book,BookSection");
    if (advanced?.kind === "article")
      params.set("publicationTypes", "JournalArticle,Review,Conference");
    const response = await fetchJson<SemanticScholarSearchResponse>(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      context.signal,
      headers,
    );
    return (response.data ?? []).map(mapPaper);
  },
};

function mapPaper(paper: SemanticScholarPaper): WorkResult {
  const doi = normalizeDoi(paper.externalIds?.DOI);
  const links: AccessLink[] = [];
  if (paper.isOpenAccess && paper.openAccessPdf?.url) {
    links.push({
      label: "Open-access PDF",
      url: paper.openAccessPdf.url,
      source: "Semantic Scholar",
      kind: "download",
      format: "PDF",
      isOpenAccess: true,
    });
  }
  if (paper.url) {
    links.push({
      label: "Semantic Scholar Record",
      url: paper.url,
      source: "Semantic Scholar",
      kind: "record",
      isOpenAccess: paper.isOpenAccess,
    });
  }

  return {
    id: `semantic-scholar:${paper.paperId}`,
    title: paper.title?.trim() || "Untitled paper",
    authors: (paper.authors ?? []).flatMap((author) =>
      author.name ? [author.name] : [],
    ),
    year: paper.year,
    publisher: paper.venue,
    kind: "article",
    abstract: paper.abstract,
    license: paper.openAccessPdf?.license,
    identifiers: {
      doi,
      pmid: paper.externalIds?.PubMed,
      other: [
        paper.externalIds?.ArXiv
          ? `arXiv:${paper.externalIds.ArXiv}`
          : undefined,
        paper.externalIds?.PubMedCentral,
        paper.externalIds?.CorpusId
          ? `CorpusID:${paper.externalIds.CorpusId}`
          : undefined,
      ].filter((value): value is string => Boolean(value)),
    },
    citation: { containerTitle: paper.venue, url: paper.url },
    sources: ["Semantic Scholar"],
    accessLinks: uniqueHttpUrls(links),
  };
}
