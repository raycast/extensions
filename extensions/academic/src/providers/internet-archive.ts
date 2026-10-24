import {
  asString,
  asStringArray,
  fetchJson,
  uniqueHttpUrls,
} from "../lib/http";
import { parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type SearchResponse = {
  response?: { docs?: SearchDocument[] };
};

type SearchDocument = {
  identifier: string;
  title?: string;
  creator?: string | string[];
  date?: string;
  year?: number;
  publisher?: string | string[];
  language?: string | string[];
  format?: string | string[];
  isbn?: string | string[];
};

type MetadataResponse = {
  metadata?: Record<string, unknown>;
  files?: Array<{
    name?: string;
    format?: string;
    size?: string;
    private?: boolean | string;
  }>;
};

export const internetArchiveProvider: SearchProvider = {
  id: "internet-archive",
  name: "Internet Archive",
  async search(query, context) {
    const parsed = parseQuery(query);
    const advanced = context.advanced;
    const escaped = parsed.raw.replace(/["\\]/g, " ").trim();
    const expression =
      advanced?.isbn || parsed.isbn
        ? `isbn:${advanced?.isbn ?? parsed.isbn} AND mediatype:texts`
        : advanced
          ? `${[advanced.title ? `title:("${advanced.title.replace(/["\\]/g, " ")}")` : undefined, advanced.authors ? `creator:("${advanced.authors.replace(/["\\]/g, " ")}")` : undefined, advanced.publisher ? `publisher:("${advanced.publisher.replace(/["\\]/g, " ")}")` : undefined, advanced.general].filter(Boolean).join(" AND ")} AND mediatype:texts`
          : `(title:("${escaped}") OR creator:("${escaped}") OR identifier:("${escaped}")) AND mediatype:texts`;
    const params = new URLSearchParams({
      q: expression,
      fl: "identifier,title,creator,date,year,publisher,language,format,isbn",
      rows: "10",
      page: "1",
      output: "json",
    });
    const data = await fetchJson<SearchResponse>(
      `https://archive.org/advancedsearch.php?${params}`,
      context.signal,
    );
    const documents = data.response?.docs ?? [];
    return Promise.all(
      documents.map((document) => enrichDocument(document, context.signal)),
    );
  },
};

async function enrichDocument(
  document: SearchDocument,
  signal: AbortSignal,
): Promise<WorkResult> {
  let metadata: MetadataResponse | undefined;
  try {
    metadata = await fetchJson<MetadataResponse>(
      `https://archive.org/metadata/${encodeURIComponent(document.identifier)}`,
      signal,
    );
  } catch {
    // The search result remains useful even when per-item file metadata is unavailable.
  }

  const restricted =
    metadata?.metadata?.["access-restricted-item"] === true ||
    metadata?.metadata?.["access-restricted-item"] === "true";
  const fileLinks = restricted
    ? []
    : buildFileLinks(document.identifier, metadata?.files ?? []);
  const accessLinks: AccessLink[] = [
    ...fileLinks,
    {
      label: restricted
        ? "Borrow / View on Internet Archive"
        : "Internet Archive Record",
      url: `https://archive.org/details/${encodeURIComponent(document.identifier)}`,
      source: "Internet Archive",
      kind: restricted ? "borrow" : "record",
    },
  ];
  const metadataIsbn = asStringArray(metadata?.metadata?.isbn);

  return {
    id: `internetarchive:${document.identifier}`,
    title:
      document.title?.trim() ||
      asString(metadata?.metadata?.title) ||
      "Untitled text",
    authors: asStringArray(document.creator).length
      ? asStringArray(document.creator)
      : asStringArray(metadata?.metadata?.creator),
    year:
      document.year ??
      parseYear(document.date) ??
      parseYear(asString(metadata?.metadata?.date)),
    publisher:
      asStringArray(document.publisher)[0] ??
      asStringArray(metadata?.metadata?.publisher)[0],
    kind: "book",
    languages: asStringArray(document.language).length
      ? asStringArray(document.language)
      : asStringArray(metadata?.metadata?.language),
    coverUrl: `https://archive.org/services/img/${encodeURIComponent(document.identifier)}`,
    identifiers: {
      isbn: [
        ...new Set(
          [...asStringArray(document.isbn), ...metadataIsbn].map((isbn) =>
            isbn.replace(/[^0-9X]/gi, ""),
          ),
        ),
      ],
      other: [document.identifier],
    },
    citation: {
      url: `https://archive.org/details/${encodeURIComponent(document.identifier)}`,
    },
    sources: ["Internet Archive"],
    accessLinks: uniqueHttpUrls(accessLinks),
  };
}

function buildFileLinks(
  identifier: string,
  files: NonNullable<MetadataResponse["files"]>,
): AccessLink[] {
  const candidates = files.filter((file) => {
    const name = file.name?.toLowerCase() ?? "";
    const isPrivate = file.private === true || file.private === "true";
    return !isPrivate && (name.endsWith(".pdf") || name.endsWith(".epub"));
  });

  return candidates
    .sort((a, b) => filePriority(a.name) - filePriority(b.name))
    .slice(0, 4)
    .flatMap((file) => {
      if (!file.name) return [];
      const format = file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF";
      const size = file.size ? ` (${formatBytes(Number(file.size))})` : "";
      return [
        {
          label: `Download ${format}${size}`,
          url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`,
          source: "Internet Archive",
          kind: "download" as const,
          format,
          isOpenAccess: true,
        },
      ];
    });
}

function filePriority(name?: string): number {
  const value = name?.toLowerCase() ?? "";
  if (value.endsWith(".epub")) return 0;
  if (value.endsWith("_text.pdf")) return 2;
  return 1;
}

function parseYear(value?: string): number | undefined {
  const match = value?.match(/\b(1[5-9]\d{2}|20\d{2}|2100)\b/);
  return match ? Number(match[1]) : undefined;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "unknown size";
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}
