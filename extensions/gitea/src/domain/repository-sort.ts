import type { Repository } from "../types/api";
import { SortOrder, type Option } from "./options";

export const RepositorySort = {
  MostStars: "most stars",
  FewestStars: "fewest stars",
  Newest: "newest",
  Oldest: "oldest",
  RecentlyUpdated: "recently",
  LeastRecentlyUpdated: "least recently",
} as const;
export type RepositorySort = (typeof RepositorySort)[keyof typeof RepositorySort];

export const RepositorySortOptions = [
  { id: "1", name: "Most stars", value: RepositorySort.MostStars },
  { id: "2", name: "Fewest stars", value: RepositorySort.FewestStars },
  { id: "3", name: "Newest", value: RepositorySort.Newest },
  { id: "4", name: "Oldest", value: RepositorySort.Oldest },
  { id: "5", name: "Recently updated", value: RepositorySort.RecentlyUpdated },
  { id: "6", name: "Least recently updated", value: RepositorySort.LeastRecentlyUpdated },
] as const satisfies readonly Option<RepositorySort>[];

export type GiteaRepositorySortKey = "stars" | "created" | "updated";
export type GiteaRepositorySort = { sort: GiteaRepositorySortKey; order: SortOrder };

const repositoryComparators = {
  [RepositorySort.MostStars]: (a, b) => numberValue(b.stars_count) - numberValue(a.stars_count),
  [RepositorySort.FewestStars]: (a, b) => numberValue(a.stars_count) - numberValue(b.stars_count),
  [RepositorySort.Newest]: (a, b) => dateValue(b.created_at) - dateValue(a.created_at),
  [RepositorySort.Oldest]: (a, b) => dateValue(a.created_at) - dateValue(b.created_at),
  [RepositorySort.RecentlyUpdated]: (a, b) => dateValue(b.updated_at) - dateValue(a.updated_at),
  [RepositorySort.LeastRecentlyUpdated]: (a, b) => dateValue(a.updated_at) - dateValue(b.updated_at),
} satisfies Record<RepositorySort, (a: Repository, b: Repository) => number>;

const giteaRepositorySort = {
  [RepositorySort.MostStars]: { sort: "stars", order: SortOrder.Descending },
  [RepositorySort.FewestStars]: { sort: "stars", order: SortOrder.Ascending },
  [RepositorySort.Newest]: { sort: "created", order: SortOrder.Descending },
  [RepositorySort.Oldest]: { sort: "created", order: SortOrder.Ascending },
  [RepositorySort.RecentlyUpdated]: { sort: "updated", order: SortOrder.Descending },
  [RepositorySort.LeastRecentlyUpdated]: { sort: "updated", order: SortOrder.Ascending },
} as const satisfies Record<RepositorySort, GiteaRepositorySort>;

export function sortRepositories(list: Repository[], sort: RepositorySort): Repository[] {
  return list.toSorted(repositoryComparators[normalizeRepositorySort(sort)]);
}

export function mapRepositorySortToGitea(sort: RepositorySort | string | undefined): GiteaRepositorySort {
  return giteaRepositorySort[normalizeRepositorySort(sort)];
}

function normalizeRepositorySort(sort: RepositorySort | string | undefined): RepositorySort {
  return isRepositorySort(sort) ? sort : RepositorySort.MostStars;
}

function isRepositorySort(sort: RepositorySort | string | undefined): sort is RepositorySort {
  return typeof sort === "string" && sort in giteaRepositorySort;
}

function numberValue(value?: number): number {
  return value ?? 0;
}

function dateValue(value?: string): number {
  return value ? Date.parse(value) || 0 : 0;
}
