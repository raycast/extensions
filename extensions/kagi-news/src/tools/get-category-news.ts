// AI tool: browse today's Kagi News stories for a specific category (e.g. "France", "Technology", "World")

import { getPreferenceValues } from "@raycast/api";
import {
  getBatchCategories,
  getBatchesByDate,
  getCategoryStories,
  getLatestBatch,
  storiesToArticles,
  toAIStorySummary,
} from "../utils";

type Input = {
  /**
   * The news category to browse, matching Kagi News' own category names (e.g. "World", "Technology", "France", "Science").
   */
  category: string;
  /**
   * Optional date to browse instead of today, in YYYY-MM-DD format (e.g. "2026-06-10"). Use this whenever the
   * user asks about a specific past day or a relative date ("last week", "last Monday") resolved to that format.
   * Archives start on 2025-07-09; omit this for today's news.
   */
  date?: string;
  /**
   * Maximum number of stories to return. Omit it to get every story of the category (a category holds 12 at
   * most), which is what the user expects when asking for a category's news. Capped at 15.
   */
  limit?: number;
};

export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const lang = preferences.language;
  const limit = Math.min(Math.max(input.limit ?? 15, 1), 15);

  let batch: { id: string; createdAt: string };
  if (input.date) {
    const batches = await getBatchesByDate(input.date, lang);
    if (batches.length === 0) {
      return { error: `No Kagi News archive found for ${input.date}. Archives start on 2025-07-09.` };
    }
    batch = batches[0];
  } else {
    batch = await getLatestBatch(lang);
  }

  const { categories } = await getBatchCategories(batch.id, lang);

  const query = input.category.trim().toLowerCase();
  const match =
    categories.find((cat) => cat.name.toLowerCase() === query) ||
    categories.find((cat) => cat.name.toLowerCase().includes(query) || query.includes(cat.name.toLowerCase()));

  if (!match) {
    return {
      error: `No category matching "${input.category}" was found in the news for ${input.date ?? "today"}.`,
      availableCategories: categories.map((cat) => cat.name),
    };
  }

  const stories = await getCategoryStories(batch.id, match.id, lang, limit);
  const articles = storiesToArticles(stories);

  return {
    category: match.name,
    batchDate: batch.createdAt,
    totalStories: articles.length,
    note: `This category has ${articles.length} stories: cover every one of them (one short line each) unless the user asks for fewer.`,
    stories: articles.map((article) => toAIStorySummary(article)),
  };
}
