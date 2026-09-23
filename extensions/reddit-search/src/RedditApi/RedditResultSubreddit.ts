export default interface RedditResultSubreddit {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  subredditName: string;
  /** When the subreddit was created (the feed exposes no "latest post" date). */
  created: string;
  /** Best-effort: only some subreddits publish an icon in their feed entry. */
  iconUrl: string;
  description: string;
  isFavorite: boolean;
  afterId: string;
}
