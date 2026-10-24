import { load } from "cheerio";
import { fetchJson, fetchText } from "../lib/http";
import type { SearchProvider, WorkResult } from "../types";

export const sepProvider: SearchProvider = {
  id: "sep",
  name: "Stanford Encyclopedia of Philosophy",
  async search(query, context) {
    const url = `https://plato.stanford.edu/search/searcher.py?${new URLSearchParams({ query, page: "1" })}`;
    const html = await fetchText(url, context.signal);
    const $ = load(html);
    return $(".result_listing")
      .slice(0, 10)
      .toArray()
      .map((element, index) => {
        const row = $(element);
        const title = row
          .find(".result_title")
          .text()
          .replace(/\s+/g, " ")
          .trim();
        const authors = row
          .find(".result_author")
          .text()
          .split(/\band\b|,|;/i)
          .map((value) => value.trim())
          .filter(Boolean);
        const canonicalUrl = row.find(".result_url a").text().trim();
        const abstract = row
          .find(".result_snippet")
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .replace(/\s+/g, " ")
          .trim();
        return encyclopediaResult(
          "sep",
          index,
          title,
          authors,
          canonicalUrl,
          "Stanford Encyclopedia of Philosophy",
          abstract,
        );
      })
      .filter(
        (result) =>
          result.title.length > 0 &&
          result.accessLinks[0]?.url.startsWith("https://"),
      );
  },
};

type IepSearch = Array<{ id: number; title: string; url: string }>;
export const iepProvider: SearchProvider = {
  id: "iep",
  name: "Internet Encyclopedia of Philosophy",
  async search(query, context) {
    const params = new URLSearchParams({ search: query, per_page: "10" });
    const rows = await fetchJson<IepSearch>(
      `https://iep.utm.edu/wp-json/wp/v2/search?${params}`,
      context.signal,
    );
    return rows.map((row, index) =>
      encyclopediaResult(
        "iep",
        index,
        decodeEntities(row.title),
        [],
        row.url,
        "Internet Encyclopedia of Philosophy",
      ),
    );
  },
};

type MediaWikiSearch = {
  query?: {
    pages?: Record<string, { pageid: number; title: string; fullurl?: string }>;
  };
};
export const encyclopediaOfMathProvider: SearchProvider = {
  id: "eom",
  name: "Encyclopedia of Mathematics",
  async search(query, context) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "10",
      prop: "info",
      inprop: "url",
      format: "json",
      origin: "*",
    });
    try {
      const data = await fetchJson<MediaWikiSearch>(
        `https://encyclopediaofmath.org/api.php?${params}`,
        context.signal,
      );
      return Object.values(data.query?.pages ?? {})
        .sort((a, b) => a.pageid - b.pageid)
        .map((row, index) =>
          encyclopediaResult(
            "eom",
            index,
            row.title,
            [],
            row.fullurl ??
              `https://encyclopediaofmath.org/wiki/${encodeURIComponent(row.title.replace(/ /g, "_"))}`,
            "Encyclopedia of Mathematics",
          ),
        );
    } catch {
      return [
        encyclopediaResult(
          "eom",
          0,
          `Search Encyclopedia of Mathematics for “${query}”`,
          [],
          `https://encyclopediaofmath.org/index.php?${new URLSearchParams({ search: query })}`,
          "Encyclopedia of Mathematics",
        ),
      ];
    }
  },
};

type NcbiSearch = { esearchresult?: { idlist?: string[] } };
type NcbiSummary = { result?: Record<string, unknown> & { uids?: string[] } };
export const ncbiBookshelfProvider: SearchProvider = {
  id: "ncbi-bookshelf",
  name: "NCBI Bookshelf",
  async search(query, context) {
    const searchParams = new URLSearchParams({
      db: "books",
      term: `${query}[Title]`,
      retmode: "json",
      retmax: "10",
    });
    const search = await fetchJson<NcbiSearch>(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`,
      context.signal,
    );
    const ids = search.esearchresult?.idlist ?? [];
    if (!ids.length) return [];
    const summaryParams = new URLSearchParams({
      db: "books",
      id: ids.join(","),
      retmode: "json",
    });
    const summary = await fetchJson<NcbiSummary>(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`,
      context.signal,
    );
    return ids.flatMap((id, index) => {
      const row = summary.result?.[id] as
        { title?: string; accessionid?: string; pubdate?: string } | undefined;
      if (!row?.title) return [];
      const accession = row.accessionid ?? id;
      const result = encyclopediaResult(
        "ncbi",
        index,
        row.title,
        [],
        `https://www.ncbi.nlm.nih.gov/books/${accession}/`,
        "NCBI Bookshelf",
      );
      result.year = row.pubdate ? Number(row.pubdate.slice(0, 4)) : undefined;
      return [result];
    });
  },
};

function externalProvider(
  id: string,
  name: string,
  buildUrl: (query: string) => string,
): SearchProvider {
  return {
    id,
    name,
    async search(query) {
      return [
        encyclopediaResult(
          id,
          0,
          `Search ${name} for “${query}”`,
          [],
          buildUrl(query),
          name,
        ),
      ];
    },
  };
}

export const scholarpediaProvider = externalProvider(
  "scholarpedia",
  "Scholarpedia",
  (query) =>
    `http://www.scholarpedia.org/w/index.php?${new URLSearchParams({ search: query })}`,
);
export const encyclopediaOfLifeProvider = externalProvider(
  "eol",
  "Encyclopedia of Life",
  (query) => `https://eol.org/search?${new URLSearchParams({ q: query })}`,
);

export const ENCYCLOPEDIA_PROVIDERS = [
  sepProvider,
  iepProvider,
  encyclopediaOfMathProvider,
  scholarpediaProvider,
  ncbiBookshelfProvider,
  encyclopediaOfLifeProvider,
];

function encyclopediaResult(
  id: string,
  index: number,
  title: string,
  authors: string[],
  url: string,
  source: string,
  abstract?: string,
): WorkResult {
  return {
    id: `${id}:${index}:${url}`,
    title,
    authors,
    kind: "encyclopedia",
    languages: ["en"],
    abstract,
    identifiers: {},
    citation: { containerTitle: source, url },
    sources: [source],
    accessLinks: [
      {
        label: `Open ${source}`,
        url,
        source,
        kind: "record",
        isOpenAccess: true,
      },
    ],
  };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
