import type { Link, SortOption } from "../types";

export function sortLinks(links: Link[], sortBy: SortOption): Link[] {
  const sorted = [...links];

  switch (sortBy) {
    case "created_desc":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "created_asc":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "visited_desc":
      return sorted.sort((a, b) => {
        if (!a.last_visited_at && !b.last_visited_at) return 0;
        if (!a.last_visited_at) return 1;
        if (!b.last_visited_at) return -1;
        return new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime();
      });
    case "visited_asc":
      return sorted.sort((a, b) => {
        if (!a.last_visited_at && !b.last_visited_at) return 0;
        if (!a.last_visited_at) return -1;
        if (!b.last_visited_at) return 1;
        return new Date(a.last_visited_at).getTime() - new Date(b.last_visited_at).getTime();
      });
    case "visits_desc":
      return sorted.sort((a, b) => b.visit_count - a.visit_count);
    case "visits_asc":
      return sorted.sort((a, b) => a.visit_count - b.visit_count);
    default:
      return sorted;
  }
}

export function getSortLabel(sortBy: SortOption): string {
  switch (sortBy) {
    case "created_desc":
      return "Newest First";
    case "created_asc":
      return "Oldest First";
    case "visited_desc":
      return "Recently Visited";
    case "visited_asc":
      return "Least Recently Visited";
    case "visits_desc":
      return "Most Visited";
    case "visits_asc":
      return "Least Visited";
    default:
      return "Default";
  }
}

export function isValidSortOption(value: string): value is SortOption {
  return ["created_desc", "created_asc", "visited_desc", "visited_asc", "visits_desc", "visits_asc"].includes(value);
}
