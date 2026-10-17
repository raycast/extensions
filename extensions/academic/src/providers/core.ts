import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type {
  AccessLink,
  SearchProvider,
  WorkKind,
  WorkResult,
} from "../types";

type CoreResponse = {
  results?: Array<{
    id: number;
    title?: string;
    abstract?: string;
    authors?: Array<{ name?: string }>;
    publisher?: string;
    publishedDate?: string;
    documentType?: string;
    doi?: string;
    downloadUrl?: string;
    identifiers?: Array<{ type?: string; identifier?: string }>;
  }>;
};

export const coreProvider: SearchProvider = {
  id: "core",
  name: "CORE",
  async search(query, context) {
    const parsed = parseQuery(query);
    const params = new URLSearchParams({
      q: parsed.doi ? `doi:${parsed.doi}` : parsed.raw,
      limit: "10",
    });
    const headers: Record<string, string> = context.coreApiKey
      ? { Authorization: `Bearer ${context.coreApiKey}` }
      : {};
    const data = await fetchJson<CoreResponse>(
      `https://api.core.ac.uk/v3/search/works?${params}`,
      context.signal,
      headers,
    );
    return (data.results ?? []).map(mapWork);
  },
};

function mapWork(
  work: NonNullable<CoreResponse["results"]>[number],
): WorkResult {
  const recordUrl = `https://core.ac.uk/works/${work.id}`;
  const links: AccessLink[] = [];
  if (work.downloadUrl) {
    links.push({
      label: "Download Open-access PDF",
      url: work.downloadUrl,
      source: "CORE",
      kind: "download",
      format: "PDF",
      isOpenAccess: true,
    });
  }
  links.push({
    label: "CORE Record",
    url: recordUrl,
    source: "CORE",
    kind: "record",
    isOpenAccess: true,
  });

  return {
    id: `core:${work.id}`,
    title: work.title?.trim() || "Untitled work",
    authors: (work.authors ?? []).flatMap((author) =>
      author.name ? [author.name] : [],
    ),
    year: work.publishedDate
      ? Number(work.publishedDate.slice(0, 4))
      : undefined,
    publisher: work.publisher,
    kind: mapKind(work.documentType),
    abstract: work.abstract,
    identifiers: {
      doi: normalizeDoi(work.doi),
      other: (work.identifiers ?? []).flatMap((identifier) =>
        identifier.identifier
          ? [`${identifier.type ?? "id"}:${identifier.identifier}`]
          : [],
      ),
    },
    citation: { url: recordUrl },
    sources: ["CORE"],
    accessLinks: uniqueHttpUrls(links),
  };
}

function mapKind(type?: string): WorkKind {
  const normalized = type?.toLowerCase() ?? "";
  if (normalized.includes("book")) return "book";
  if (normalized.includes("thesis") || normalized.includes("dissertation"))
    return "thesis";
  if (normalized.includes("report")) return "report";
  if (
    normalized.includes("article") ||
    normalized.includes("review") ||
    normalized.includes("paper")
  )
    return "article";
  return "other";
}
