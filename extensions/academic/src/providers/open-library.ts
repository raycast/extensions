import { asStringArray, fetchJsonViaHttps } from "../lib/http";
import { parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type OpenLibraryResponse = {
  docs: Array<{
    key?: string;
    title?: string;
    author_name?: string[];
    first_publish_year?: number;
    publisher?: string[];
    isbn?: string[];
    cover_i?: number;
    ia?: string[];
    public_scan_b?: boolean;
    lending_edition_s?: string;
    language?: string[];
  }>;
};

export const openLibraryProvider: SearchProvider = {
  id: "open-library",
  name: "Open Library",
  async search(query, context) {
    const parsed = parseQuery(query);
    const params = new URLSearchParams({ limit: "10" });
    const advanced = context.advanced;
    if (advanced?.isbn ?? parsed.isbn)
      params.set("isbn", advanced?.isbn ?? parsed.isbn!);
    else if (advanced) {
      if (advanced.title) params.set("title", advanced.title);
      if (advanced.authors) params.set("author", advanced.authors);
      if (advanced.publisher) params.set("publisher", advanced.publisher);
      if (!advanced.title && !advanced.authors && !advanced.publisher)
        params.set("q", parsed.raw);
      if (advanced.languages?.[0]) params.set("lang", advanced.languages[0]);
    } else params.set("q", parsed.raw);
    params.set(
      "fields",
      "key,title,author_name,first_publish_year,publisher,isbn,cover_i,ia,public_scan_b,lending_edition_s,language",
    );

    const data = await fetchJsonViaHttps<OpenLibraryResponse>(
      `https://openlibrary.org/search.json?${params}`,
      context.signal,
    );
    return data.docs.map(mapDocument);
  },
};

function mapDocument(
  document: OpenLibraryResponse["docs"][number],
): WorkResult {
  const key = document.key ?? "";
  const identifier = document.ia?.[0];
  const accessLinks: AccessLink[] = [
    {
      label: "Open Library Record",
      url: `https://openlibrary.org${key}`,
      source: "Open Library",
      kind: "record" as const,
    },
  ];
  if (identifier) {
    accessLinks.unshift({
      label: document.public_scan_b
        ? "Read on Internet Archive"
        : "Borrow on Internet Archive",
      url: `https://archive.org/details/${encodeURIComponent(identifier)}`,
      source: "Open Library",
      kind: document.public_scan_b ? "read" : "borrow",
    });
  }

  return {
    id: `openlibrary:${key || document.isbn?.[0] || document.title}`,
    title: document.title?.trim() || "Untitled book",
    authors: asStringArray(document.author_name),
    year: document.first_publish_year,
    publisher: document.publisher?.[0],
    kind: "book",
    languages: document.language,
    coverUrl: document.cover_i
      ? `https://covers.openlibrary.org/b/id/${document.cover_i}-L.jpg`
      : undefined,
    identifiers: { isbn: document.isbn, other: key ? [key] : undefined },
    citation: { url: `https://openlibrary.org${key}` },
    sources: ["Open Library"],
    accessLinks,
  };
}
