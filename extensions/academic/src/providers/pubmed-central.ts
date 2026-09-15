import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type SearchResponse = { esearchresult?: { idlist?: string[] } };
type SummaryRecord = {
  uid?: string;
  title?: string;
  pubdate?: string;
  source?: string;
  fulljournalname?: string;
  authors?: Array<{ name?: string }>;
  volume?: string;
  issue?: string;
  pages?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
};
type SummaryResponse = {
  result?: {
    uids?: string[];
    [id: string]: SummaryRecord | string[] | undefined;
  };
};

export const pubMedCentralProvider: SearchProvider = {
  id: "pubmed-central",
  name: "PubMed Central",
  async search(query, context) {
    const parsed = parseQuery(query);
    const term = `${parsed.doi ? `${parsed.doi}[DOI]` : parsed.raw} AND open access[filter] AND has_pdf[filter]`;
    const common = { retmode: "json", tool: "research_source_finder" };
    const searchParams = new URLSearchParams({
      ...common,
      db: "pmc",
      term,
      retmax: "10",
    });
    if (context.contactEmail) searchParams.set("email", context.contactEmail);
    const search = await fetchJson<SearchResponse>(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`,
      context.signal,
    );
    const ids = search.esearchresult?.idlist ?? [];
    if (!ids.length) return [];

    const summaryParams = new URLSearchParams({
      ...common,
      db: "pmc",
      id: ids.join(","),
    });
    if (context.contactEmail) summaryParams.set("email", context.contactEmail);
    const summary = await fetchJson<SummaryResponse>(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`,
      context.signal,
    );
    return (summary.result?.uids ?? []).flatMap((id) => {
      const record = summary.result?.[id];
      return record && !Array.isArray(record) ? [mapRecord(id, record)] : [];
    });
  },
};

function mapRecord(id: string, record: SummaryRecord): WorkResult {
  const articleIds = record.articleids ?? [];
  const pmcid =
    articleIds.find((item) => item.idtype === "pmcid")?.value ?? `PMC${id}`;
  const pmid = articleIds.find((item) => item.idtype === "pmid")?.value;
  const doi = normalizeDoi(
    articleIds.find((item) => item.idtype === "doi")?.value,
  );
  const articleUrl = `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`;
  const links: AccessLink[] = [
    {
      label: "Open PDF",
      url: `${articleUrl}pdf/`,
      source: "PubMed Central",
      kind: "download",
      format: "PDF",
      isOpenAccess: true,
    },
    {
      label: "Read in PubMed Central",
      url: articleUrl,
      source: "PubMed Central",
      kind: "read",
      isOpenAccess: true,
    },
  ];

  return {
    id: `pmc:${pmcid}`,
    title: record.title?.trim() || "Untitled article",
    authors: (record.authors ?? []).flatMap((author) =>
      author.name ? [author.name] : [],
    ),
    year: record.pubdate ? Number(record.pubdate.slice(0, 4)) : undefined,
    publisher: record.fulljournalname ?? record.source,
    kind: "article",
    identifiers: { doi, pmid, other: [pmcid] },
    citation: {
      containerTitle: record.fulljournalname ?? record.source,
      volume: record.volume,
      issue: record.issue,
      pages: record.pages,
      url: articleUrl,
    },
    sources: ["PubMed Central"],
    accessLinks: uniqueHttpUrls(links),
  };
}
