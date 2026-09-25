import fallbackCatalog from "../fallback-catalog.json";

export interface CatalogGif {
  file: string;
  poster: string;
  slug: string;
  tags: string[];
  title: string;
}

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ASSET_PATH = /^\/gifs\/[a-z0-9]+(?:-[a-z0-9]+)*\.(gif|jpg)$/;

export const isSafeSlug = (slug: unknown): slug is string => typeof slug === "string" && SAFE_SLUG.test(slug);

const isSafeAssetPath = (path: unknown): path is string => typeof path === "string" && SAFE_ASSET_PATH.test(path);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const isCatalogGif = (value: unknown): value is CatalogGif => {
  if (!isRecord(value)) {
    return false;
  }

  if (!isSafeSlug(value.slug)) {
    return false;
  }

  if (!isSafeAssetPath(value.file) || !isSafeAssetPath(value.poster)) {
    return false;
  }

  if (typeof value.title !== "string") {
    return false;
  }

  return Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string");
};

export const parseCatalog = (value: unknown): CatalogGif[] => {
  if (!Array.isArray(value)) {
    throw new Error("Catalog must be an array");
  }

  const gifs = value.filter(isCatalogGif);

  if (gifs.length === 0) {
    throw new Error("Catalog is empty");
  }

  return gifs;
};

export const bundledCatalog: CatalogGif[] = parseCatalog(fallbackCatalog);

export const absoluteUrl = (path: string, origin: string): string => {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new Error("Catalog path must be root-relative");
  }

  const base = new URL(origin);

  if (base.protocol !== "https:" && base.protocol !== "http:") {
    throw new Error("Site origin must be HTTP or HTTPS");
  }

  const url = new URL(path, base);

  if (url.origin !== base.origin) {
    throw new Error("Catalog URL must stay on the site origin");
  }

  return url.href;
};
