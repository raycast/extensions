import { Color, Icon, List } from "@raycast/api";
import { RepositorySort } from "../../domain/repository-sort";
import type { Repository } from "../../types/api";
import { getLanguageColor } from "../../utils/languages";

export function getRepositoryAccessories(item: Repository, sort?: RepositorySort): List.Item.Accessory[] {
  return [
    ...(item.language ? [{ tag: { value: item.language, color: getLanguageColor(item.language, true) } }] : []),
    getRepositorySortAccessory(item, sort),
  ];
}

export function getRepositorySortAccessory(item: Repository, sort?: RepositorySort): List.Item.Accessory {
  switch (sort) {
    case RepositorySort.MostStars:
    case RepositorySort.FewestStars:
      return { icon: Icon.Star, text: { value: `${item.stars_count ?? 0}`, color: Color.SecondaryText } };
    case RepositorySort.Newest:
    case RepositorySort.Oldest:
      return item.created_at ? { icon: Icon.Calendar, date: new Date(item.created_at) } : { icon: Icon.Calendar };
    case RepositorySort.RecentlyUpdated:
    case RepositorySort.LeastRecentlyUpdated:
      return item.updated_at ? { icon: Icon.Calendar, date: new Date(item.updated_at) } : { icon: Icon.Calendar };
  }

  return {};
}
