import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type {
  AccessLink,
  SearchProvider,
  WorkKind,
  WorkResult,
} from "../types";

type ZenodoResponse = {
  hits?: {
    hits?: Array<{
      id: number;
      doi?: string;
      metadata?: {
        title?: string;
        description?: string;
        publication_date?: string;
        access_right?: string;
        language?: string;
        creators?: Array<{ name?: string }>;
        publisher?: string;
        resource_type?: { type?: string; subtype?: string; title?: string };
        journal?: {
          title?: string;
          volume?: string;
          issue?: string;
          pages?: string;
        };
      };
      files?: Array<{ key?: string; links?: { self?: string } }>;
      links?: {
        self_html?: string;
        thumbnails?: Record<string, string>;
      };
    }>;
  };
};

export const zenodoProvider: SearchProvider = {
  id: "zenodo",
  name: "Zenodo",
  async search(query, context) {
    const parsed = parseQuery(query);
    const baseQuery = parsed.doi ? `doi:"${parsed.doi}"` : parsed.raw;
    const params = new URLSearchParams({
      q: `${baseQuery} AND resource_type.type:publication`,
      size: "10",
    });
    const data = await fetchJson<ZenodoResponse>(
      `https://zenodo.org/api/records?${params}`,
      context.signal,
    );
    return (data.hits?.hits ?? []).map(mapRecord);
  },
};

function mapRecord(
  record: NonNullable<NonNullable<ZenodoResponse["hits"]>["hits"]>[number],
): WorkResult {
  const metadata = record.metadata ?? {};
  const isOpen = metadata.access_right === "open";
  const links: AccessLink[] = [];
  if (isOpen) {
    for (const file of record.files ?? []) {
      if (!file.links?.self) continue;
      const format = file.key?.split(".").pop()?.toUpperCase();
      links.push({
        label: format ? `Download ${format}` : "Download File",
        url: file.links.self,
        source: "Zenodo",
        kind: "download",
        format,
        isOpenAccess: true,
      });
    }
  }
  if (record.links?.self_html) {
    links.push({
      label: "Zenodo Record",
      url: record.links.self_html,
      source: "Zenodo",
      kind: "record",
      isOpenAccess: isOpen,
    });
  }

  return {
    id: `zenodo:${record.id}`,
    title: stripHtml(metadata.title) || "Untitled publication",
    authors: (metadata.creators ?? []).flatMap((creator) =>
      creator.name ? [creator.name] : [],
    ),
    year: metadata.publication_date
      ? Number(metadata.publication_date.slice(0, 4))
      : undefined,
    publisher: metadata.journal?.title ?? metadata.publisher,
    kind: mapKind(
      metadata.resource_type?.subtype ?? metadata.resource_type?.title,
    ),
    languages: metadata.language ? [metadata.language] : undefined,
    coverUrl:
      record.links?.thumbnails?.["250"] ?? record.links?.thumbnails?.["100"],
    abstract: stripHtml(metadata.description),
    identifiers: { doi: normalizeDoi(record.doi) },
    citation: {
      containerTitle: metadata.journal?.title,
      volume: metadata.journal?.volume,
      issue: metadata.journal?.issue,
      pages: metadata.journal?.pages,
      url: record.links?.self_html,
    },
    sources: ["Zenodo"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function mapKind(type?: string): WorkKind {
  const normalized = type?.toLowerCase() ?? "";
  if (normalized.includes("book")) return "book";
  if (normalized.includes("thesis")) return "thesis";
  if (normalized.includes("report")) return "report";
  if (
    normalized.includes("article") ||
    normalized.includes("paper") ||
    normalized.includes("preprint")
  )
    return "article";
  return "other";
}

function stripHtml(value?: string): string | undefined {
  return (
    value
      ?.replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim() || undefined
  );
}
