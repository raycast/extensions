import { Icon } from "@raycast/api";
import { SearchResult } from "./types";

export function getSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function getAiSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50`;
}

export function getIcon(item: SearchResult) {
  if (item.isHistory) {
    return Icon.Clock;
  }
  if (item.isNavigation) {
    return Icon.Link;
  }
  return Icon.MagnifyingGlass;
}
