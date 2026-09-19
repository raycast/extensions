import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type EuropePmcResult = {
  id?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  journalVolume?: string;
  issue?: string;
  pageInfo?: string;
  pubYear?: string;
  issn?: string;
  abstractText?: string;
  language?: string;
  fullTextUrlList?: {
    fullTextUrl?: Array<{
      availability?: string;
      documentStyle?: string;
      site?: string;
      url?: string;
    }>;
  };
};

type EuropePmcResponse = {
  resultList?: { result?: EuropePmcResult[] };
};

export const europePmcProvider: SearchProvider = {
  id: "europe-pmc",
  name: "Europe PMC",
  async search(query, context) {
    const parsed = parseQuery(query);
    const advanced = context.advanced;
    const searchExpression = advanced
      ? [
          advanced.doi ? `DOI:${advanced.doi}` : undefined,
          advanced.title
            ? `TITLE:"${advanced.title.replace(/"/g, "")}"`
            : undefined,
          advanced.authors
            ? `AUTH:"${advanced.authors.replace(/"/g, "")}"`
            : undefined,
          advanced.journal
            ? `JOURNAL:"${advanced.journal.replace(/"/g, "")}"`
            : undefined,
          advanced.issn ? `ISSN:${advanced.issn}` : undefined,
          advanced.yearFrom || advanced.yearTo
            ? `FIRST_PDATE:[${advanced.yearFrom ?? 1800}-01-01 TO ${advanced.yearTo ?? new Date().getFullYear()}-12-31]`
            : undefined,
          advanced.general,
        ]
          .filter(Boolean)
          .join(" AND ")
      : parsed.doi
        ? `DOI:${parsed.doi}`
        : parsed.raw;
    const params = new URLSearchParams({
      query: searchExpression,
      format: "json",
      pageSize: "10",
      resultType: "core",
    });
    const data = await fetchJson<EuropePmcResponse>(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`,
      context.signal,
    );
    return (data.resultList?.result ?? []).map(mapResult);
  },
};

function mapResult(result: EuropePmcResult): WorkResult {
  const links: AccessLink[] = (
    result.fullTextUrlList?.fullTextUrl ?? []
  ).flatMap((link) => {
    if (!link.url) return [];
    const format = link.documentStyle?.toUpperCase();
    return [
      {
        label: `${format === "PDF" ? "Download" : "Read"} ${format ?? "Full Text"}${link.site ? ` — ${link.site}` : ""}`,
        url: link.url,
        source: "Europe PMC",
        kind: format === "PDF" ? ("download" as const) : ("read" as const),
        format,
        isOpenAccess: link.availability?.toLowerCase().includes("open"),
      },
    ];
  });
  const recordUrl = result.pmcid
    ? `https://europepmc.org/articles/${result.pmcid}`
    : `https://europepmc.org/article/MED/${result.pmid ?? result.id}`;
  links.push({
    label: "Europe PMC Record",
    url: recordUrl,
    source: "Europe PMC",
    kind: "record",
  });

  return {
    id: `europepmc:${result.id ?? result.pmid ?? result.doi}`,
    title: result.title?.trim() || "Untitled article",
    authors: result.authorString?.split(/,\s*|;\s*/).filter(Boolean) ?? [],
    year: result.pubYear ? Number(result.pubYear) : undefined,
    publisher: result.journalTitle,
    kind: "article",
    languages: result.language ? [result.language] : undefined,
    abstract: result.abstractText,
    identifiers: {
      doi: normalizeDoi(result.doi),
      issn: result.issn ? [result.issn] : undefined,
      pmid: result.pmid,
      other: result.pmcid ? [result.pmcid] : undefined,
    },
    citation: {
      containerTitle: result.journalTitle,
      volume: result.journalVolume,
      issue: result.issue,
      pages: result.pageInfo,
      url: recordUrl,
    },
    sources: ["Europe PMC"],
    accessLinks: uniqueHttpUrls(links),
  };
}
