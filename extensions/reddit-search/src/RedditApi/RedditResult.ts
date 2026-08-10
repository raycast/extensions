import RedditResultItem from "./RedditResultItem";
import RedditResultSubreddit from "./RedditResultSubreddit";
import { RateLimit } from "./Api";

export default interface RedditResult {
  url: string;
  items: RedditResultItem[];
  subreddits: RedditResultSubreddit[];
  /** Set only when the result came from the cache, so the UI can say how stale it is. */
  cachedAt?: number;
  /** Reddit's reported request budget after this call. Absent on cache hits. */
  rateLimit?: RateLimit;
}
