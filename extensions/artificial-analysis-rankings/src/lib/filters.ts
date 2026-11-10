import { filterRankings, type Model, type RankedModel } from "./models";

export interface BrowseFilter {
  providerId: string;
  favoritesOnly: boolean;
}

export const ALL_PROVIDERS = "all";

export function providers(models: Model[]): { id: string; name: string }[] {
  const creators = new Map(models.map((model) => [model.creatorId, model.creator]));
  return [...creators].map(([id, name]) => ({ id, name })).toSorted((a, b) => a.name.localeCompare(b.name, "en"));
}

export function browseEntries(
  entries: RankedModel[],
  query: string,
  filter: BrowseFilter,
  favorites: ReadonlySet<string>,
): RankedModel[] {
  return filterRankings(entries, query).filter(
    (model) =>
      (filter.providerId === ALL_PROVIDERS || model.creatorId === filter.providerId) &&
      (!filter.favoritesOnly || favorites.has(model.id)),
  );
}
