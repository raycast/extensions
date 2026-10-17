import type { Catalog, Model } from "./types";

export interface CatalogView {
  models: Model[];
  folded: number;
}

export function foldModels(
  models: Model[],
  maxModels: number,
  searchText: string,
): CatalogView {
  if (searchText.trim().length > 0) return { models, folded: 0 };
  return {
    models: models.slice(0, maxModels),
    folded: Math.max(0, models.length - maxModels),
  };
}

export interface CatalogViews {
  go: CatalogView;
  zen: CatalogView;
}

export function foldCatalog(
  catalog: Catalog,
  maxModels: number,
  searchText: string,
): CatalogViews {
  return {
    go: foldModels(catalog.go, maxModels, searchText),
    zen: foldModels(catalog.zen, maxModels, searchText),
  };
}
