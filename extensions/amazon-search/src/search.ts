import { MAX_RECENT_SEARCHES } from "./constants";

export function getSearchUrl(text: string, tld: string) {
  return `https://www.amazon.${tld}/s?k=${encodeURIComponent(text)}`;
}

export function addRecentSearch(recentSearches: string[], text: string) {
  return [text, ...recentSearches.filter((item) => item !== text)].slice(0, MAX_RECENT_SEARCHES);
}
