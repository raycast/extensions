import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type GoogleBooksResponse = {
  items?: Array<{
    id: string;
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      description?: string;
      industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
      imageLinks?: Record<string, string>;
      infoLink?: string;
      canonicalVolumeLink?: string;
      language?: string;
    };
    accessInfo?: {
      publicDomain?: boolean;
      accessViewStatus?: string;
      webReaderLink?: string;
      pdf?: { isAvailable?: boolean; downloadLink?: string };
      epub?: { isAvailable?: boolean; downloadLink?: string };
    };
  }>;
};

export const googleBooksProvider: SearchProvider = {
  id: "google-books",
  name: "Google Books",
  async search(query, context) {
    if (!context.googleBooksApiKey)
      throw new Error("Set Google Books API Key in extension preferences.");
    const parsed = parseQuery(query);
    const advanced = context.advanced;
    const search = advanced
      ? [
          advanced.isbn ? `isbn:${advanced.isbn}` : undefined,
          advanced.title ? `intitle:${advanced.title}` : undefined,
          advanced.authors ? `inauthor:${advanced.authors}` : undefined,
          advanced.publisher ? `inpublisher:${advanced.publisher}` : undefined,
          advanced.general,
        ]
          .filter(Boolean)
          .join(" ")
      : parsed.isbn
        ? `isbn:${parsed.isbn}`
        : parsed.raw;
    const params = new URLSearchParams({
      q: search,
      maxResults: "10",
      printType: "books",
      key: context.googleBooksApiKey,
    });
    if (advanced?.languages?.length === 1)
      params.set("langRestrict", advanced.languages[0]);
    const data = await fetchJson<GoogleBooksResponse>(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
      context.signal,
    );
    return (data.items ?? []).map(mapVolume);
  },
};

function mapVolume(
  volume: NonNullable<GoogleBooksResponse["items"]>[number],
): WorkResult {
  const metadata = volume.volumeInfo ?? {};
  const access = volume.accessInfo ?? {};
  const links: AccessLink[] = [];
  if (access.publicDomain && access.pdf?.isAvailable && access.pdf.downloadLink)
    links.push({
      label: "Download PDF",
      url: access.pdf.downloadLink,
      source: "Google Books",
      kind: "download",
      format: "PDF",
      isOpenAccess: true,
    });
  if (
    access.publicDomain &&
    access.epub?.isAvailable &&
    access.epub.downloadLink
  )
    links.push({
      label: "Download EPUB",
      url: access.epub.downloadLink,
      source: "Google Books",
      kind: "download",
      format: "EPUB",
      isOpenAccess: true,
    });
  if (access.webReaderLink && access.accessViewStatus !== "NONE")
    links.push({
      label:
        access.accessViewStatus === "SAMPLE"
          ? "Open Preview"
          : "Read on Google Books",
      url: access.webReaderLink,
      source: "Google Books",
      kind: "read",
      isOpenAccess: access.publicDomain,
    });
  const recordUrl = metadata.canonicalVolumeLink ?? metadata.infoLink;
  if (recordUrl)
    links.push({
      label: "Google Books Record",
      url: recordUrl,
      source: "Google Books",
      kind: "record",
    });
  const industry = metadata.industryIdentifiers ?? [];

  return {
    id: `googlebooks:${volume.id}`,
    title:
      [metadata.title, metadata.subtitle].filter(Boolean).join(": ") ||
      "Untitled book",
    authors: metadata.authors ?? [],
    year: metadata.publishedDate
      ? Number(metadata.publishedDate.slice(0, 4))
      : undefined,
    publisher: metadata.publisher,
    kind: "book",
    languages: metadata.language ? [metadata.language] : undefined,
    coverUrl:
      metadata.imageLinks?.extraLarge ??
      metadata.imageLinks?.large ??
      metadata.imageLinks?.thumbnail,
    abstract: metadata.description,
    identifiers: {
      isbn: industry
        .filter((item) => item.type?.startsWith("ISBN"))
        .flatMap((item) => (item.identifier ? [item.identifier] : [])),
      other: [volume.id],
    },
    citation: { url: recordUrl },
    sources: ["Google Books"],
    accessLinks: uniqueHttpUrls(links),
  };
}
