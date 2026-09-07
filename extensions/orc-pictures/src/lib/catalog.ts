import fallbackCatalog from "../fallback-catalog.json";

export interface CatalogGif {
  file: string;
  poster: string;
  slug: string;
  tags: string[];
  title: string;
}

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
    value.tags.every((tag) => typeof tag === "string")
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

export const absoluteUrl = (path: string, origin: string): string =>
  new URL(path, origin).toString();
