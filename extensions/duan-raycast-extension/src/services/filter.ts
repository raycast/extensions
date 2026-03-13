import type { Link, FilterOption } from "../types";

export function filterLinks(links: Link[], filterBy: FilterOption): Link[] {
  switch (filterBy) {
    case "active":
      return links.filter((link) => link.is_enabled === 1);
    case "disabled":
      return links.filter((link) => link.is_enabled === 0);
    case "all":
    default:
      return links;
  }
}

export function getFilterLabel(filterBy: FilterOption): string {
  switch (filterBy) {
    case "active":
      return "Active";
    case "disabled":
      return "Disabled";
    case "all":
    default:
      return "All";
  }
}
