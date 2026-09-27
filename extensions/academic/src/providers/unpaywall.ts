import { fetchJson, uniqueHttpUrls } from "../lib/http";
import { normalizeDoi, parseQuery } from "../lib/query";
import type { AccessLink, SearchProvider, WorkResult } from "../types";

type UnpaywallLocation = {
  url?: string;
  url_for_pdf?: string;
  url_for_landing_page?: string;
  host_type?: string;
  license?: string;
};

type UnpaywallWork = {
  doi?: string;
  title?: string;
  genre?: string;
  year?: number;
  published_date?: string;
  publisher?: string;
  journal_name?: string;
  is_oa?: boolean;
  z_authors?: Array<{ given?: string; family?: string }>;
  best_oa_location?: UnpaywallLocation;
  oa_locations?: UnpaywallLocation[];
};

type UnpaywallSearch = { results?: Array<{ response?: UnpaywallWork }> };

export const unpaywallProvider: SearchProvider = {
  id: "unpaywall",
  name: "Unpaywall",
  async search(query, context) {
    if (!context.contactEmail)
      throw new Error(
        "Set Contact Email in extension preferences to enable Unpaywall.",
      );
    const parsed = parseQuery(query);
    if (parsed.doi) {
      const params = new URLSearchParams({ email: context.contactEmail });
      const work = await fetchJson<UnpaywallWork>(
        `https://api.unpaywall.org/v2/${encodeURIComponent(parsed.doi)}?${params}`,
        context.signal,
      );
      return [mapWork(work)];
    }
    const params = new URLSearchParams({
      query: parsed.raw,
      is_oa: "true",
      email: context.contactEmail,
    });
    const data = await fetchJson<UnpaywallSearch>(
      `https://api.unpaywall.org/v2/search?${params}`,
      context.signal,
    );
    return (data.results ?? []).flatMap((result) =>
      result.response ? [mapWork(result.response)] : [],
    );
  },
};

function mapWork(work: UnpaywallWork): WorkResult {
  const doi = normalizeDoi(work.doi);
  const locationMap = new Map<string, UnpaywallLocation>();
  for (const location of [
    work.best_oa_location,
    ...(work.oa_locations ?? []),
  ]) {
    const key =
      location?.url_for_pdf ?? location?.url_for_landing_page ?? location?.url;
    if (key && location) locationMap.set(key, location);
  }
  const links: AccessLink[] = [];
  for (const location of locationMap.values()) {
    if (location.url_for_pdf)
      links.push({
        label: `Download PDF${location.host_type ? ` — ${location.host_type}` : ""}`,
        url: location.url_for_pdf,
        source: "Unpaywall",
        kind: "download",
        format: "PDF",
        isOpenAccess: true,
      });
    const landing = location.url_for_landing_page ?? location.url;
    if (landing)
      links.push({
        label: `Open OA Location${location.license ? ` — ${location.license}` : ""}`,
        url: landing,
        source: "Unpaywall",
        kind: "read",
        isOpenAccess: true,
      });
  }
  if (doi)
    links.push({
      label: "DOI Record",
      url: `https://doi.org/${doi}`,
      source: "Unpaywall",
      kind: "record",
    });

  return {
    id: `unpaywall:${doi ?? work.title}`,
    title: work.title?.trim() || "Untitled article",
    authors: (work.z_authors ?? [])
      .map((author) => [author.given, author.family].filter(Boolean).join(" "))
      .filter(Boolean),
    year:
      work.year ??
      (work.published_date
        ? Number(work.published_date.slice(0, 4))
        : undefined),
    publisher: work.journal_name ?? work.publisher,
    kind: work.genre === "book" ? "book" : "article",
    identifiers: { doi },
    citation: {
      containerTitle: work.journal_name,
      url: doi
        ? `https://doi.org/${doi}`
        : links.find((link) => link.kind === "read")?.url,
    },
    sources: ["Unpaywall"],
    accessLinks: uniqueHttpUrls(links),
  };
}
