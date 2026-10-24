import { asStringArray, fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type {
  AccessLink,
  SearchProvider,
  WorkKind,
  WorkResult,
} from "../types";

type CrossrefResponse = {
  message: {
    items: Array<{
      DOI?: string;
      URL?: string;
      title?: string[];
      subtitle?: string[];
      author?: Array<{ given?: string; family?: string; name?: string }>;
      publisher?: string;
      "container-title"?: string[];
      volume?: string;
      issue?: string;
      page?: string;
      type?: string;
      issued?: { "date-parts"?: number[][] };
      published?: { "date-parts"?: number[][] };
      ISBN?: string[];
      ISSN?: string[];
      abstract?: string;
      language?: string;
      link?: Array<{
        URL?: string;
        "content-type"?: string;
        "content-version"?: string;
      }>;
    }>;
  };
};

export const crossrefProvider: SearchProvider = {
  id: "crossref",
  name: "Crossref",
  async search(query, context) {
    const parsed = parseQuery(query);
    const params = new URLSearchParams({ rows: "10" });
    const advanced = context.advanced;
    const doi = advanced?.doi ?? parsed.doi;
    const filters: string[] = [];
    if (doi) filters.push(`doi:${doi}`);
    if (advanced?.kind && advanced.kind !== "any")
      filters.push(`type:${crossrefType(advanced.kind)}`);
    if (advanced?.yearFrom)
      filters.push(`from-pub-date:${advanced.yearFrom}-01-01`);
    if (advanced?.yearTo)
      filters.push(`until-pub-date:${advanced.yearTo}-12-31`);
    if (filters.length) params.set("filter", filters.join(","));
    if (!doi)
      params.set(
        "query.bibliographic",
        advanced
          ? [
              advanced.title,
              advanced.authors,
              advanced.publisher,
              advanced.journal,
              advanced.issn,
              advanced.general,
            ]
              .filter(Boolean)
              .join(", ")
          : parsed.raw,
      );
    if (context.contactEmail) params.set("mailto", context.contactEmail);

    const data = await fetchJson<CrossrefResponse>(
      `https://api.crossref.org/works?${params}`,
      context.signal,
    );
    return data.message.items.map(mapItem);
  },
};

function crossrefType(kind: string): string {
  return (
    {
      book: "book",
      article: "journal-article",
      thesis: "dissertation",
      report: "report",
    }[kind] ?? kind
  );
}

function mapItem(
  item: CrossrefResponse["message"]["items"][number],
): WorkResult {
  const doi = normalizeDoi(item.DOI);
  const title =
    [...asStringArray(item.title), ...asStringArray(item.subtitle)].join(
      ": ",
    ) || "Untitled work";
  const links: AccessLink[] = (item.link ?? []).flatMap((link) => {
    if (!link.URL) return [];
    const format = link["content-type"]?.split("/").pop()?.toUpperCase();
    return [
      {
        label: format ? `Download ${format}` : "Publisher Full Text",
        url: link.URL,
        source: "Crossref",
        kind: "download" as const,
        format,
      },
    ];
  });
  if (item.URL)
    links.push({
      label: "DOI / Publisher Page",
      url: item.URL,
      source: "Crossref",
      kind: "record",
    });

  return {
    id: `crossref:${doi ?? item.URL ?? title}`,
    title,
    authors: (item.author ?? [])
      .map(
        (author) =>
          author.name ??
          [author.given, author.family].filter(Boolean).join(" "),
      )
      .filter(Boolean),
    year:
      item.issued?.["date-parts"]?.[0]?.[0] ??
      item.published?.["date-parts"]?.[0]?.[0],
    publisher: item.publisher,
    kind: mapKind(item.type),
    languages: item.language ? [item.language] : undefined,
    abstract: item.abstract
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    identifiers: { doi, isbn: item.ISBN, issn: item.ISSN },
    citation: {
      containerTitle: item["container-title"]?.[0],
      volume: item.volume,
      issue: item.issue,
      pages: item.page,
      url: item.URL,
    },
    sources: ["Crossref"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function mapKind(type?: string): WorkKind {
  if (type?.includes("journal") || type === "proceedings-article")
    return "article";
  if (type?.includes("book")) return "book";
  if (type === "dissertation") return "thesis";
  if (type === "report") return "report";
  return "other";
}
