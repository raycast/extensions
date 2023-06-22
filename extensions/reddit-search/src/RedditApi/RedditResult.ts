import RedditResultItem from "./RedditResultItem";
import RedditResultSubreddit from "./RedditResultSubreddit";

export default interface RedditResult {
  url: string;
  items: RedditResultItem[];
  subreddits: RedditResultSubreddit[];
}
