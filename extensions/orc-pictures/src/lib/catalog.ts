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

export const isSafeSlug = (slug: string): boolean => SAFE_SLUG.test(slug);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && !Array.isArray(value) && value.constructor === Object;

const isCatalogGif = (value: unknown): value is CatalogGif => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.file === "string" &&
    typeof value.poster === "string" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    isSafeSlug(value.slug) &&
    SAFE_ASSET_PATH.test(value.file) &&
    SAFE_ASSET_PATH.test(value.poster)
  );
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
  const url = new URL(path, base);

  if (url.origin !== base.origin) {
    throw new Error("Catalog URL must stay on the site origin");
  }

  return url.href;
};
