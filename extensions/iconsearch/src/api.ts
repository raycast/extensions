import {
  API_BASE,
  ACRONYM_PARTS,
  NAMED_LIBRARIES,
  PAGE_SIZE,
  PRODUCT,
  SEARCH_API_URL,
} from "./constants";
import type { IconSearchIcon, SearchResult, SearchStyle } from "./types";

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
  library: string;
  style: SearchStyle;
  legalOnly: boolean;
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
  url.searchParams.set("legalOnly", options.legalOnly ? "1" : "0");
  applyLibraryParams(url, options.library);
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
  const iconifySets = Array.isArray(facets.iconifySets)
    ? facets.iconifySets.filter((set): set is string => typeof set === "string")
    : [];

  return {
    icons,
    total,
    page: typeof payload.page === "number" ? payload.page : options.page,
    totalPages,
    iconifySets,
  };
}

export function applyLibraryParams(url: URL, value: string) {
  if (value === "all") return;
  if (value === "iconify") {
    url.searchParams.set("lib", "iconify");
    return;
  }
  if (value.startsWith("iconify:")) {
    url.searchParams.set("lib", "iconify");
    url.searchParams.set("iconifySet", value.slice("iconify:".length));
    return;
  }
  url.searchParams.set("lib", value);
}

export function formatLibraryName(library: string): string {
  const found = NAMED_LIBRARIES.find(([id]) => id === library);
  if (found) return found[1];
  if (library.startsWith("iconify-"))
    return `${formatIconifySet(library.replace(/^iconify-/, ""))} (Iconify)`;
  return library;
}

export function formatIconifySet(value: string): string {
  return value
    .replace(/^iconify-/, "")
    .split("-")
    .map((part) =>
      ACRONYM_PARTS.has(part)
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
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
    legalSafe: value.legalSafe === true,
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
  const exactName = name;
  const dashedName = name.replace(/_/g, "-");
  const underscoredName = name.replace(/-/g, "_");

  const add = (url: string) => {
    const cleaned = cleanSvgUrl(url, library);
    if (isHttpUrl(cleaned)) urls.add(cleaned);
  };

  if (library === "patternfly-icons" || library === "bootstrap-icons") {
    add(
      `${API_BASE}/api/icon-preview/${encodeURIComponent(library)}/${encodeURIComponent(dashedName)}?v=named-library-preview-v3`,
    );
  }

  add(stringFrom(icon.svgUrl));

  if (library === "lucide-icons") {
    add(`https://unpkg.com/lucide-static@latest/icons/${exactName}.svg`);
    add(`https://api.iconify.design/lucide/${dashedName}.svg`);
  } else if (library === "tabler-icons") {
    add(
      `https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/${dashedName}.svg`,
    );
    add(`https://api.iconify.design/tabler/${dashedName}.svg`);
  } else if (library === "patternfly-icons") {
    add(
      `${API_BASE}/api/icon-preview/patternfly-icons/${dashedName}?v=named-library-preview-v3`,
    );
  } else if (library === "phosphor-icons") {
    add(
      `https://unpkg.com/@phosphor-icons/core@latest/assets/regular/${dashedName}.svg`,
    );
    add(`https://api.iconify.design/ph/${dashedName}.svg`);
  } else if (library === "heroicons") {
    add(`https://api.iconify.design/heroicons/${dashedName}.svg`);
    add(`https://api.iconify.design/heroicons-outline/${dashedName}.svg`);
    add(`https://api.iconify.design/heroicons-solid/${dashedName}.svg`);
  } else if (library === "bootstrap-icons") {
    add(
      `https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/icons/${dashedName}.svg`,
    );
    add(`https://api.iconify.design/bi/${dashedName}.svg`);
  } else if (library === "feather-icons") {
    add(`https://unpkg.com/feather-icons@latest/dist/icons/${dashedName}.svg`);
    add(`https://api.iconify.design/feather/${dashedName}.svg`);
  } else if (library === "remix-icon") {
    add(`https://api.iconify.design/ri/${dashedName}.svg`);
  } else if (library === "iconoir") {
    add(`https://api.iconify.design/iconoir/${dashedName}.svg`);
  } else if (library === "ionicons") {
    add(`https://api.iconify.design/ion/${exactName}.svg`);
    add(`https://api.iconify.design/ion/${dashedName}.svg`);
    add(`https://api.iconify.design/ion/${underscoredName}.svg`);
  } else if (library === "octicons") {
    add(`https://api.iconify.design/octicon/${exactName}.svg`);
    add(`https://api.iconify.design/octicon/${dashedName}.svg`);
    add(`https://api.iconify.design/octicon/${underscoredName}.svg`);
  } else if (library === "ant-design-icons") {
    add(`https://api.iconify.design/ant-design/${dashedName}.svg`);
    add(`https://api.iconify.design/ant-design/${dashedName}-outlined.svg`);
    add(`https://api.iconify.design/ant-design/${dashedName}-filled.svg`);
  } else if (library.startsWith("iconify-")) {
    const prefix = library.replace(/^iconify-/, "");
    add(`https://api.iconify.design/${prefix}/${exactName}.svg`);
    add(`https://api.iconify.design/${prefix}/${dashedName}.svg`);
    add(`https://api.iconify.design/${prefix}/${underscoredName}.svg`);
  }

  return Array.from(urls);
}

function cleanSvgUrl(url: string, library: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (library === "tabler-icons" && url.includes("@tabler/icons/icons/")) {
    return url.replace("@tabler/icons/icons/", "@tabler/icons@2.47.0/icons/");
  }
  if (
    library === "phosphor-icons" &&
    url.includes("@phosphor-icons/core/assets/")
  ) {
    return url.replace(
      "@phosphor-icons/core/assets/",
      "@phosphor-icons/core@2.1.1/assets/",
    );
  }
  if (library === "lucide-icons" && url.includes("lucide-static/icons/")) {
    return url.replace("lucide-static/icons/", "lucide-static@0.415.0/icons/");
  }
  return url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
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
