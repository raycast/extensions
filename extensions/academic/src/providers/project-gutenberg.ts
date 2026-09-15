import { fetchJsonViaHttps, uniqueHttpUrls } from "../lib/http";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type GutendexResponse = {
  results?: Array<{
    id: number;
    title?: string;
    authors?: Array<{
      name?: string;
      birth_year?: number;
      death_year?: number;
    }>;
    summaries?: string[];
    copyright?: boolean | null;
    media_type?: string;
    languages?: string[];
    formats?: Record<string, string>;
  }>;
};

export const projectGutenbergProvider: SearchProvider = {
  id: "project-gutenberg",
  name: "Project Gutenberg",
  async search(query, context) {
    const params = new URLSearchParams({ search: query, copyright: "false" });
    const data = await fetchJsonViaHttps<GutendexResponse>(
      `https://gutendex.com/books/?${params}`,
      context.signal,
    );
    return (data.results ?? [])
      .filter((book) => book.media_type === "Text")
      .map(mapBook);
  },
};

function mapBook(
  book: NonNullable<GutendexResponse["results"]>[number],
): WorkResult {
  const formats = book.formats ?? {};
  const links: AccessLink[] = [];
  for (const [mimeType, url] of Object.entries(formats)) {
    if (!url) continue;
    const format = formatName(mimeType);
    if (!format) continue;
    links.push({
      label: format === "HTML" ? "Read Online" : `Download ${format}`,
      url,
      source: "Project Gutenberg",
      kind: format === "HTML" ? "read" : "download",
      format,
      isOpenAccess: book.copyright === false,
    });
  }
  links.push({
    label: "Project Gutenberg Record",
    url: `https://www.gutenberg.org/ebooks/${book.id}`,
    source: "Project Gutenberg",
    kind: "record",
    isOpenAccess: book.copyright === false,
  });

  return {
    id: `gutenberg:${book.id}`,
    title: book.title?.trim() || "Untitled book",
    authors: (book.authors ?? []).flatMap((author) =>
      author.name ? [author.name] : [],
    ),
    kind: "book",
    languages: book.languages,
    coverUrl: formats["image/jpeg"],
    abstract: book.summaries?.[0],
    identifiers: { other: [`gutenberg:${book.id}`] },
    citation: { url: `https://www.gutenberg.org/ebooks/${book.id}` },
    sources: ["Project Gutenberg"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function formatName(mimeType: string): string | undefined {
  const value = mimeType.toLowerCase();
  if (value === "application/epub+zip") return "EPUB";
  if (value === "application/x-mobipocket-ebook") return "MOBI";
  if (value.startsWith("text/plain")) return "TXT";
  if (value === "text/html") return "HTML";
  return undefined;
}
