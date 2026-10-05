import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { SearchProvider, WorkKind, WorkResult } from "../types";

type OpenAlexResponse = {
  results: Array<{
    id: string;
    doi?: string;
    title?: string;
    publication_year?: number;
    type?: string;
    language?: string;
    is_retracted?: boolean;
    authorships?: Array<{ author?: { display_name?: string } }>;
    primary_location?: Location;
    best_oa_location?: Location;
    open_access?: { is_oa?: boolean };
    ids?: { pmid?: string };
    biblio?: {
      volume?: string;
      issue?: string;
      first_page?: string;
      last_page?: string;
    };
  }>;
};

type Location = {
  landing_page_url?: string;
  pdf_url?: string;
  source?: { display_name?: string };
};

export const openAlexProvider: SearchProvider = {
  id: "openalex",
  name: "OpenAlex",
  async search(query, context) {
    const parsed = parseQuery(query);
    const params = new URLSearchParams({ "per-page": "10" });
    const advanced = context.advanced;
    const doi = advanced?.doi ?? parsed.doi;
    const filters: string[] = [];
    if (doi) filters.push(`doi:https://doi.org/${doi}`);
    if (advanced?.kind && advanced.kind !== "any")
      filters.push(`type:${openAlexType(advanced.kind)}`);
    if (advanced?.yearFrom)
      filters.push(`from_publication_date:${advanced.yearFrom}-01-01`);
    if (advanced?.yearTo)
      filters.push(`to_publication_date:${advanced.yearTo}-12-31`);
    if (advanced?.openAccessOnly) filters.push("is_oa:true");
    if (filters.length) params.set("filter", filters.join(","));
    if (!doi)
      params.set(
        "search",
        advanced
          ? [
              advanced.title,
              advanced.authors,
              advanced.publisher,
              advanced.journal,
              advanced.general,
            ]
              .filter(Boolean)
              .join(" ")
          : parsed.raw,
      );
    if (context.contactEmail) params.set("mailto", context.contactEmail);

    const data = await fetchJson<OpenAlexResponse>(
      `https://api.openalex.org/works?${params}`,
      context.signal,
    );
    return data.results.map(mapWork);
  },
};

function openAlexType(kind: string): string {
  return (
    {
      article: "article",
      book: "book",
      thesis: "dissertation",
      report: "report",
    }[kind] ?? kind
  );
}

function mapWork(work: OpenAlexResponse["results"][number]): WorkResult {
  const doi = normalizeDoi(work.doi);
  const location = work.best_oa_location ?? work.primary_location;
  const links = [];
  if (location?.pdf_url) {
    links.push({
      label: `Download PDF${location.source?.display_name ? ` — ${location.source.display_name}` : ""}`,
      url: location.pdf_url,
      source: "OpenAlex",
      kind: "download" as const,
      format: "PDF",
      isOpenAccess: work.open_access?.is_oa,
    });
  }
  if (location?.landing_page_url) {
    links.push({
      label: `Open Full-text Location${location.source?.display_name ? ` — ${location.source.display_name}` : ""}`,
      url: location.landing_page_url,
      source: "OpenAlex",
      kind: "read" as const,
      isOpenAccess: work.open_access?.is_oa,
    });
  }
  links.push({
    label: "OpenAlex Record",
    url: work.id,
    source: "OpenAlex",
    kind: "record" as const,
  });

  return {
    id: `openalex:${work.id}`,
    title: work.title?.trim() || "Untitled work",
    authors: (work.authorships ?? []).flatMap((authorship) =>
      authorship.author?.display_name ? [authorship.author.display_name] : [],
    ),
    year: work.publication_year,
    kind: mapKind(work.type),
    languages: work.language ? [work.language] : undefined,
    isRetracted: work.is_retracted,
    identifiers: { doi, pmid: work.ids?.pmid?.split("/").pop() },
    citation: {
      containerTitle: location?.source?.display_name,
      volume: work.biblio?.volume,
      issue: work.biblio?.issue,
      pages:
        [work.biblio?.first_page, work.biblio?.last_page]
          .filter(Boolean)
          .join("–") || undefined,
      url: location?.landing_page_url ?? work.id,
    },
    sources: ["OpenAlex"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function mapKind(type?: string): WorkKind {
  if (type === "book" || type === "book-chapter") return "book";
  if (type === "dissertation") return "thesis";
  if (type === "report") return "report";
  if (type === "article" || type === "review") return "article";
  return "other";
}
