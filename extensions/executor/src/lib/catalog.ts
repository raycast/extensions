import { safeBrowserUrl, record } from "./execution";
import { titleCase } from "./format";

export const CATALOG_KINDS = ["mcp", "openapi", "graphql"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export const KIND_LABEL: Record<CatalogKind, string> = { mcp: "MCP", openapi: "API", graphql: "GraphQL" };
export interface CatalogItem {
  id: string;
  domain: string;
  title: string;
  description: string;
  kind: CatalogKind;
  slug?: string;
  url?: string;
  auth?: { kind?: string; header?: string; note?: string };
  specOverrides?: unknown[];
}
const REGISTRY = "https://integrations.sh";
export const CATALOG_PAGE_SIZE = 40;
const isKind = (value: unknown): value is CatalogKind => CATALOG_KINDS.includes(value as CatalogKind);

/** Pasted endpoints stay out of the public catalog search, including partial URLs. */
export function isUrlInput(value: string): boolean {
  return /[:/\\?@#]/.test(value) || /\S+\.\S+/.test(value);
}

export function endpointUrl(value: string): string | undefined {
  return safeBrowserUrl(value.includes("://") ? value.trim() : `https://${value.trim()}`);
}

export function catalogPage(payload: unknown, kind?: CatalogKind) {
  const rows = record(payload)?.results;
  if (!Array.isArray(rows)) throw new Error("The integration catalog returned an unexpected response.");
  const items: CatalogItem[] = [];
  for (const raw of rows) {
    const row = record(raw);
    if (!row || typeof row.domain !== "string" || typeof row.description !== "string") continue;
    const name =
      typeof row.name === "string" && row.name !== row.domain ? row.name : titleCase(row.domain.split(".")[0]);
    const surfaces = Array.isArray(row.surfaces)
      ? row.surfaces
      : Array.isArray(row.kinds)
        ? row.kinds.map((value) => ({ kind: value }))
        : [];
    for (const rawSurface of surfaces) {
      const surface = record(rawSurface);
      if (!surface || !isKind(surface.kind) || (kind && surface.kind !== kind)) continue;
      const auth = record(surface.auth);
      const slug = typeof surface.slug === "string" ? surface.slug : undefined;
      items.push({
        id: `${row.domain}:${surface.kind}:${slug ?? "default"}`,
        domain: row.domain,
        title: `${name} ${KIND_LABEL[surface.kind]}`,
        description: row.description,
        kind: surface.kind,
        slug,
        url: typeof surface.url === "string" ? surface.url : undefined,
        auth: auth
          ? {
              kind: typeof auth.kind === "string" ? auth.kind : undefined,
              header: typeof auth.header === "string" ? auth.header : undefined,
              note: typeof auth.note === "string" ? auth.note : undefined,
            }
          : undefined,
        specOverrides: Array.isArray(surface.specOverrides) ? surface.specOverrides : undefined,
      });
    }
  }
  return {
    data: [...new Map(items.map((item) => [item.id, item])).values()],
    hasMore: rows.length === CATALOG_PAGE_SIZE,
  };
}

async function publicJson(url: URL) {
  const response = await fetch(url, { headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`Integration catalog unavailable (HTTP ${response.status}). Try again.`);
  return response.json() as Promise<unknown>;
}

async function searchCatalogPage(query: string, kind: CatalogKind | undefined, page: number) {
  const url = new URL("/api/search", REGISTRY);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", String(CATALOG_PAGE_SIZE));
  url.searchParams.set("offset", String(page * CATALOG_PAGE_SIZE));
  if (kind) url.searchParams.set("kind", kind);
  return catalogPage(await publicJson(url), kind);
}

export async function searchCatalog(query: string, kind: CatalogKind | undefined, page: number) {
  if (isUrlInput(query)) return { data: [] as CatalogItem[], hasMore: false };
  return searchCatalogPage(query, kind, page);
}

/** Re-fetch a selected public catalog domain without treating it as free-text endpoint input. */
export async function lookupCatalogItem(domain: string, kind: CatalogKind, slug?: string): Promise<CatalogItem> {
  const labels = domain.split(".");
  if (
    domain.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  ) {
    throw new Error("Use the exact public catalog domain returned by search-integration-catalog.");
  }
  for (let page = 0; page < 25; page++) {
    const result = await searchCatalogPage(domain, kind, page);
    const matches = result.data.filter((item) => item.domain === domain && item.kind === kind && item.slug === slug);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new Error("The catalog returned an ambiguous setup target.");
    if (!result.hasMore) {
      throw new Error("The exact catalog item is unavailable. Search the integration catalog again.");
    }
  }
  throw new Error("The exact catalog lookup exceeded 1,000 results. Open Add Integration to select the item.");
}

export async function resolveCatalogItem(item: CatalogItem): Promise<CatalogItem> {
  if (item.url) {
    if (!safeBrowserUrl(item.url)) throw new Error("The catalog endpoint is not a supported secure URL.");
    return item;
  }
  const data = record(await publicJson(new URL(`/api/${encodeURIComponent(item.domain)}/surface`, REGISTRY)));
  const surfaces = Array.isArray(data?.surfaces) ? data.surfaces : [];
  const candidates = surfaces
    .map(record)
    .filter(
      (surface) =>
        surface &&
        surface.type === (item.kind === "openapi" ? "http" : item.kind) &&
        (!item.slug || surface.slug === item.slug),
    );
  if (candidates.length !== 1)
    throw new Error("The catalog cannot identify one setup endpoint. Open the catalog website for details.");
  const value = candidates[0]?.[item.kind === "openapi" ? "spec" : "url"];
  if (typeof value !== "string" || !safeBrowserUrl(value))
    throw new Error("No supported setup URL is available for this integration.");
  return { ...item, url: value };
}

export function integrationSetupPath(kind: CatalogKind, item?: Partial<CatalogItem>): string {
  const query = new URLSearchParams();
  if (item?.url) {
    if (!safeBrowserUrl(item.url))
      throw new Error("Enter an HTTPS endpoint or a local HTTP endpoint without credentials.");
    query.set("url", item.url);
  }
  if (item?.slug) query.set("namespace", item.slug);
  if (item?.auth?.kind) query.set("authKind", item.auth.kind);
  if (item?.auth?.header) query.set("authHeader", item.auth.header);
  if (item?.auth?.note) query.set("authNote", item.auth.note);
  if (item?.specOverrides?.length) query.set("specOverrides", JSON.stringify(item.specOverrides));
  return `/integrations/add/${kind}${query.size ? `?${query}` : ""}`;
}
