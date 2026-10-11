import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type DoajResponse = {
  results?: Array<{
    id: string;
    bibjson?: {
      title?: string;
      abstract?: string;
      year?: string;
      language?: string[];
      author?: Array<{ name?: string }>;
      identifier?: Array<{ type?: string; id?: string }>;
      journal?: { title?: string; publisher?: string; issns?: string[] };
      link?: Array<{ url?: string; type?: string; content_type?: string }>;
    };
  }>;
};

export const doajProvider: SearchProvider = {
  id: "doaj",
  name: "DOAJ",
  async search(query, context) {
    const parsed = parseQuery(query);
    const search = parsed.doi
      ? `bibjson.identifier.id:${parsed.doi}`
      : parsed.raw;
    const data = await fetchJson<DoajResponse>(
      `https://doaj.org/api/v4/search/articles/${encodeURIComponent(search)}?pageSize=10`,
      context.signal,
    );
    return (data.results ?? []).map(mapArticle);
  },
};

function mapArticle(
  article: NonNullable<DoajResponse["results"]>[number],
): WorkResult {
  const metadata = article.bibjson ?? {};
  const identifiers = metadata.identifier ?? [];
  const doi = normalizeDoi(
    identifiers.find((identifier) => identifier.type === "doi")?.id,
  );
  const issn = identifiers
    .filter(
      (identifier) =>
        identifier.type === "issn" ||
        identifier.type === "eissn" ||
        identifier.type === "pissn",
    )
    .flatMap((identifier) => (identifier.id ? [identifier.id] : []));
  const links: AccessLink[] = (metadata.link ?? []).flatMap((link) => {
    if (!link.url) return [];
    const format = detectFormat(link.content_type, link.url);
    return [
      {
        label: format ? `Download ${format}` : "Read Full Text",
        url: link.url,
        source: "DOAJ",
        kind: format ? ("download" as const) : ("read" as const),
        format,
        isOpenAccess: true,
      },
    ];
  });
  links.push({
    label: "DOAJ Record",
    url: `https://doaj.org/article/${article.id}`,
    source: "DOAJ",
    kind: "record",
    isOpenAccess: true,
  });

  return {
    id: `doaj:${article.id}`,
    title: stripHtml(metadata.title) || "Untitled article",
    authors: (metadata.author ?? []).flatMap((author) =>
      author.name ? [author.name] : [],
    ),
    year: metadata.year ? Number(metadata.year) : undefined,
    publisher: metadata.journal?.title ?? metadata.journal?.publisher,
    kind: "article",
    languages: metadata.language,
    abstract: stripHtml(metadata.abstract),
    identifiers: {
      doi,
      issn: [...new Set([...issn, ...(metadata.journal?.issns ?? [])])],
    },
    citation: {
      containerTitle: metadata.journal?.title,
      url: `https://doaj.org/article/${article.id}`,
    },
    sources: ["DOAJ"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function stripHtml(value?: string): string | undefined {
  return (
    value
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || undefined
  );
}

function detectFormat(contentType?: string, url?: string): string | undefined {
  const value = `${contentType ?? ""} ${url ?? ""}`.toLowerCase();
  if (value.includes("pdf") || value.includes(".pdf")) return "PDF";
  if (value.includes("epub") || value.includes(".epub")) return "EPUB";
  return undefined;
}
