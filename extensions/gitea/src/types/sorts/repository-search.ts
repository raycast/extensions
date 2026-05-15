import dayjs from "dayjs";
import type { Repository } from "../api";
import { CommonOptionType, SortOrder } from "./common";

export const RepositorySortOption = {
  MostStars: "most stars",
  FewestStars: "fewest stars",
  Newest: "newest",
  Oldest: "oldest",
  RecentlyUpdated: "recently",
  LeastRecentlyUpdated: "least recently",
} as const;
export type RepositorySortOption = (typeof RepositorySortOption)[keyof typeof RepositorySortOption];

export const RepositorySortTypes: CommonOptionType[] = [
  { id: "1", name: "Most stars", value: RepositorySortOption.MostStars },
  { id: "2", name: "Fewest stars", value: RepositorySortOption.FewestStars },
  { id: "3", name: "Newest", value: RepositorySortOption.Newest },
  { id: "4", name: "Oldest", value: RepositorySortOption.Oldest },
  { id: "5", name: "Recently updated", value: RepositorySortOption.RecentlyUpdated },
  { id: "6", name: "Least recently updated", value: RepositorySortOption.LeastRecentlyUpdated },
] as const;

export function SortRepositories(list: Repository[], sortType: RepositorySortOption | string): Repository[] {
  switch (sortType) {
    case RepositorySortOption.MostStars:
      return list.toSorted((a: Repository, b: Repository) => (b.stars_count ?? 0) - (a.stars_count ?? 0));
    case RepositorySortOption.FewestStars:
      return list.toSorted((a: Repository, b: Repository) => (a.stars_count ?? 0) - (b.stars_count ?? 0));
    case RepositorySortOption.Newest:
      return list.toSorted((a: Repository, b: Repository) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return dayjs(a.created_at).isBefore(dayjs(b.created_at)) ? 1 : -1;
      });
    case RepositorySortOption.Oldest:
      return list.toSorted((a: Repository, b: Repository) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return dayjs(a.created_at).isAfter(dayjs(b.created_at)) ? 1 : -1;
      });
    case RepositorySortOption.RecentlyUpdated:
      return list.toSorted((a: Repository, b: Repository) => {
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return dayjs(a.updated_at).isBefore(dayjs(b.updated_at)) ? 1 : -1;
      });
    case RepositorySortOption.LeastRecentlyUpdated:
      return list.toSorted((a: Repository, b: Repository) => {
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return dayjs(a.updated_at).isAfter(dayjs(b.updated_at)) ? 1 : -1;
      });
    default:
      return list;
  }
}

export type GiteaRepositorySort = { sort?: string; order?: SortOrder };
export function mapRepositorySortToGitea(sortType: RepositorySortOption | string): GiteaRepositorySort {
  switch (sortType) {
    case RepositorySortOption.MostStars:
      return { sort: "stars", order: SortOrder.Descending };
    case RepositorySortOption.FewestStars:
      return { sort: "stars", order: SortOrder.Ascending };
    case RepositorySortOption.Newest:
      return { sort: "created", order: SortOrder.Descending };
    case RepositorySortOption.Oldest:
      return { sort: "created", order: SortOrder.Ascending };
    case RepositorySortOption.RecentlyUpdated:
      return { sort: "updated", order: SortOrder.Descending };
    case RepositorySortOption.LeastRecentlyUpdated:
      return { sort: "updated", order: SortOrder.Ascending };
    default:
      return {};
  }
}
