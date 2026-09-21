import { Article, endpoint, get, Paginated } from "../lib/screvi";

type Input = {
  /**
   * Which part of the reading list to read. "inbox" is unprocessed, "later" is
   * deliberately deferred, "archive" is done with. Omit for all three.
   */
  homeStatus?: "inbox" | "later" | "archive";
  /** Free text matched against title, author and domain. */
  query?: string;
  /** Only articles the user favourited. */
  favorite?: boolean;
  /** How many to return. Defaults to 20, at most 50. */
  limit?: number;
};

/**
 * List the user's saved articles — their read-later queue. Use this to answer
 * questions about what they have saved but not yet read, or to find a specific
 * saved page.
 */
export default async function listArticles(input: Input) {
  const { data } = await get<Paginated<Article>>(
    endpoint("/articles", {
      home_status: input.homeStatus,
      q: input.query,
      favorite: input.favorite,
      per_page: Math.min(input.limit ?? 20, 50),
    }),
  );

  return data.map((article) => ({
    title: article.title,
    author: article.author,
    site: article.site_name ?? article.source_domain,
    excerpt: article.excerpt,
    status: article.home_status,
    readingTimeMinutes: article.reading_time_minutes,
    progressPercentage: article.progress_percentage,
    highlightCount: article.highlight_count,
    tags: article.tags.map((tag) => tag.name),
    savedAt: article.saved_at,
    originalUrl: article.url,
    url: article.screvi_url,
  }));
}
