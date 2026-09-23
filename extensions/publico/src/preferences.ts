import { getPreferenceValues } from "@raycast/api";
import { Article } from "./api/type";

/**
 * The Max Articles preference as a number.
 *
 * `Preferences` is the type Raycast generates from package.json into
 * raycast-env.d.ts, so it stays in step with the manifest automatically.
 * Do not redeclare it locally: a hand-written copy widens
 * `"10" | "25" | "50"` back to `string` and silently drifts when the
 * manifest changes.
 */
export function getMaxArticles(): number {
  const { maxArticles } = getPreferenceValues<Preferences>();
  return Number.parseInt(maxArticles, 10) || 25;
}

/** Trim a feed to the user's Max Articles preference. */
export function limitArticles(articles: Article[]): Article[] {
  return articles.slice(0, getMaxArticles());
}
