import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

const ARXIV_OPENALEX_SOURCE = "S4306400194";

type OpenAlexArxivResponse = {
  results?: Array<{
    id: string;
    doi?: string;
    title?: string;
    publication_year?: number;
    language?: string;
    is_retracted?: boolean;
    authorships?: Array<{ author?: { display_name?: string } }>;
    locations?: Array<{
      landing_page_url?: string;
      pdf_url?: string;
      source?: { id?: string; display_name?: string };
    }>;
    biblio?: {
      volume?: string;
      issue?: string;
      first_page?: string;
      last_page?: string;
    };
  }>;
};

/**
 * arXiv's public Atom endpoint frequently returns shared-IP 429 responses in
 * desktop extensions. OpenAlex indexes the same arXiv repository and provides
 * stable discovery; returned access URLs still point only to arxiv.org.
 */
export const arxivProvider: SearchProvider = {
  id: "arxiv",
  name: "arXiv",
  async search(query, context) {
    const parsed = parseQuery(query);
    const advanced = context.advanced;
    const doi = advanced?.doi ?? parsed.doi;
    const filters = [`locations.source.id:${ARXIV_OPENALEX_SOURCE}`];
    if (doi) filters.push(`doi:https://doi.org/${doi}`);
    if (advanced?.yearFrom)
      filters.push(`from_publication_date:${advanced.yearFrom}-01-01`);
    if (advanced?.yearTo)
      filters.push(`to_publication_date:${advanced.yearTo}-12-31`);

    const params = new URLSearchParams({
      filter: filters.join(","),
      "per-page": "10",
      select:
        "id,doi,title,publication_year,language,is_retracted,authorships,locations,biblio",
    });
    if (!doi) {
      const text = advanced
        ? [advanced.title, advanced.authors, advanced.general]
            .filter(Boolean)
            .join(" ")
        : parsed.raw;
      params.set("search", text);
    }
    if (context.contactEmail) params.set("mailto", context.contactEmail);

    const data = await fetchJson<OpenAlexArxivResponse>(
      `https://api.openalex.org/works?${params}`,
      context.signal,
    );
    return (data.results ?? []).flatMap((work) => {
      const mapped = mapWork(work);
      return mapped.accessLinks.length ? [mapped] : [];
    });
  },
};

function mapWork(
  work: NonNullable<OpenAlexArxivResponse["results"]>[number],
): WorkResult {
  const arxivLocations = (work.locations ?? []).filter((location) =>
    location.source?.id?.endsWith(ARXIV_OPENALEX_SOURCE),
  );
  const links: AccessLink[] = [];
  for (const location of arxivLocations) {
    if (location.pdf_url) {
      links.push({
        label: "Download PDF",
        url: toHttps(location.pdf_url),
        source: "arXiv",
        kind: "download",
        format: "PDF",
        isOpenAccess: true,
      });
    }
    if (location.landing_page_url) {
      const url = toHttps(location.landing_page_url);
      const isPdf = /\/pdf\//i.test(url);
      links.push({
        label: isPdf ? "Download PDF" : "arXiv Record",
        url,
        source: "arXiv",
        kind: isPdf ? "download" : "record",
        format: isPdf ? "PDF" : undefined,
        isOpenAccess: true,
      });
    }
  }
  const recordUrl = links.find((link) => link.kind === "record")?.url;
  const firstPage = work.biblio?.first_page;
  const lastPage = work.biblio?.last_page;
  return {
    id: `arxiv:${work.id.split("/").pop() ?? work.id}`,
    title: work.title?.trim() || "Untitled preprint",
    authors: (work.authorships ?? []).flatMap((authorship) =>
      authorship.author?.display_name ? [authorship.author.display_name] : [],
    ),
    year: work.publication_year,
    publisher: "arXiv",
    kind: "article",
    languages: work.language ? [work.language] : undefined,
    version: "Preprint",
    isRetracted: work.is_retracted,
    identifiers: { doi: normalizeDoi(work.doi) },
    citation: {
      containerTitle: "arXiv",
      volume: work.biblio?.volume,
      issue: work.biblio?.issue,
      pages: [firstPage, lastPage].filter(Boolean).join("–") || undefined,
      url: recordUrl,
    },
    sources: ["arXiv"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function toHttps(url: string): string {
  return url.replace(/^http:/i, "https:");
}
