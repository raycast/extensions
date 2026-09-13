import {
  API_BASE,
  ACRONYM_PARTS,
  NAMED_LIBRARIES,
  PAGE_SIZE,
  PRODUCT,
  SEARCH_API_URL,
} from "./constants";
import type {
  IconSearchIcon,
  SearchResult,
  SearchStyle,
  SourceSetOption,
} from "./types";

type ApiResponse = {
  icons?: unknown;
  total?: unknown;
  page?: unknown;
  limit?: unknown;
  totalPages?: unknown;
  facets?: unknown;
  error?: unknown;
};

type SearchOptions = {
  token: string;
  query: string;
  sourceSet: string;
  style: SearchStyle;
  page: number;
  limit?: number;
  signal?: AbortSignal;
};

export class IconSearchApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function searchIcons(
  options: SearchOptions,
): Promise<SearchResult> {
  const url = new URL(SEARCH_API_URL);
  const query = options.query.trim();

  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", String(options.limit || PAGE_SIZE));
  url.searchParams.set("page", String(Math.max(1, options.page)));
  url.searchParams.set("sort", query ? "relevance" : "popular");
  applySourceSetParam(url, options.sourceSet);
  if (options.style !== "all") url.searchParams.set("style", options.style);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${options.token}`,
      "x-iconsearch-product": PRODUCT,
    },
    signal: options.signal,
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse;

  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `IconSearch API returned ${response.status}`;
    throw new IconSearchApiError(message, response.status);
  }

  const icons = Array.isArray(payload.icons)
    ? payload.icons
        .map(normalizeIcon)
        .filter((icon): icon is IconSearchIcon => Boolean(icon))
    : [];
  const total =
    typeof payload.total === "number" ? payload.total : icons.length;
  const limit =
    typeof payload.limit === "number" && payload.limit > 0
      ? payload.limit
      : PAGE_SIZE;
  const totalPages =
    typeof payload.totalPages === "number"
      ? payload.totalPages
      : total > 0
        ? Math.ceil(total / limit)
        : 0;
  const facets = isRecord(payload.facets) ? payload.facets : {};
  const sourceSets = Array.isArray(facets.sourceSets)
    ? facets.sourceSets
        .map(normalizeSourceSet)
        .filter((set): set is SourceSetOption => Boolean(set))
    : [];

  return {
    icons,
    total,
    page: typeof payload.page === "number" ? payload.page : options.page,
    totalPages,
    sourceSets,
  };
}

export function applySourceSetParam(url: URL, value: string) {
  if (value === "all") return;
  url.searchParams.set("sourceSet", value);
}

export function formatLibraryName(library: string): string {
  const found = NAMED_LIBRARIES.find(([id]) => id === library);
  if (found) return found[1];
  return formatSourceSet(library);
}

export function formatSourceSet(value: string): string {
  return value
    .split("-")
    .map((part) =>
      ACRONYM_PARTS.has(part)
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

function normalizeSourceSet(value: unknown): SourceSetOption | undefined {
  if (!isRecord(value)) return undefined;
  const id = stringFrom(value.id);
  const name = stringFrom(value.name);
  return id && name ? { id, name } : undefined;
}

function normalizeIcon(value: unknown): IconSearchIcon | undefined {
  if (!isRecord(value)) return undefined;

  const name = stringFrom(value.name);
  const library = stringFrom(value.library);
  if (!name || !library) return undefined;

  const previewUrls = getPreviewUrls(value, library, name);
  if (previewUrls.length === 0) return undefined;

  const apiDisplayName = stringFrom(value.displayName);

  return {
    id: stringFrom(value.id) || `${library}-${name}`,
    name,
    displayName: formatIconTitle(apiDisplayName || name),
    library,
    libraryName: stringFrom(value.libraryName) || formatLibraryName(library),
    npmPackage: stringFrom(value.npmPackage) || undefined,
    license: stringFrom(value.license) || undefined,
    licenseUrl:
      stringFrom(value.licenseUrl) ||
      stringFrom(value.license_url) ||
      `${API_BASE}/licenses`,
    sourceSetId: stringFrom(value.sourceSetId) || library,
    authorName: stringFrom(value.authorName) || undefined,
    authorUrl: stringFrom(value.authorUrl) || undefined,
    licenseNotice:
      stringFrom(value.licenseNotice) ||
      `${stringFrom(value.libraryName) || formatLibraryName(library)}. License: ${stringFrom(value.license) || "Unknown"}. Review the upstream license before use.`,
    usageRequirements:
      stringFrom(value.usageRequirements) ||
      "Review the upstream license before use.",
    commercialUseAllowed: value.commercialUseAllowed === true,
    exportAllowed: value.exportAllowed !== false,
    sourceUrl:
      stringFrom(value.sourceUrl) ||
      stringFrom(value.source_url) ||
      previewUrls[0],
    svgUrl: previewUrls[0],
    previewUrls,
    reactImport: stringFrom(value.reactImport) || undefined,
    reactUsage: stringFrom(value.reactUsage) || undefined,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

function getPreviewUrls(
  icon: Record<string, unknown>,
  library: string,
  name: string,
): string[] {
  const urls = new Set<string>();

  const add = (value: unknown) => {
    const url = stringFrom(value).trim();
    if (!url) return;
    if (url.startsWith("/")) {
      urls.add(`${API_BASE}${url}`);
      return;
    }
    if (url.startsWith("//")) {
      urls.add(`https:${url}`);
      return;
    }
    if (url.startsWith("https://") || url.startsWith("http://")) urls.add(url);
  };

  add(icon.svgUrl);
  if (Array.isArray(icon.previewUrls)) icon.previewUrls.forEach(add);

  const normalizedName = name.replace(/_/g, "-");
  if (library && normalizedName) {
    add(
      `${API_BASE}/api/svg/${encodeURIComponent(library)}/${encodeURIComponent(normalizedName)}`,
    );
  }

  return Array.from(urls);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatIconTitle(value: string): string {
  const withWordBoundaries = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  return withWordBoundaries
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) =>
      ACRONYM_PARTS.has(part.toLowerCase())
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}
