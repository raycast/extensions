import { stripUrl } from "./strip-url";

export function repoURL(repository: string): string {
  return `https://codewiki.google/${stripUrl(repository)}`;
}

export function repoSearchURL(query: string): string {
  return `https://codewiki.google/search?q=${encodeURIComponent(query)}`;
}
