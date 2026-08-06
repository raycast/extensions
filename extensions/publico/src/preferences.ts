import { getPreferenceValues } from "@raycast/api";
import { Article } from "./api/type";

interface Preferences {
  maxArticles: string;
}

export function getMaxArticles(): number {
  const { maxArticles } = getPreferenceValues<Preferences>();
  return Number.parseInt(maxArticles, 10) || 25;
}

/** Trim a feed to the user's Max Articles preference. */
export function limitArticles(articles: Article[]): Article[] {
  return articles.slice(0, getMaxArticles());
}
