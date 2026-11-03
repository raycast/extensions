import { Query, request } from "./api";
import { Post, postLookupSchema, postPageSchema } from "./schemas";

export type SearchSort = "Latest" | "Top" | "Photos" | "Videos";

export type MediaFilter = "images" | "videos" | "gifs" | "media" | "links" | "none";

export type SearchFilters = {
  fromUser?: string;
  mentioning?: string;
  language?: string;
  sinceDate?: string;
  untilDate?: string;
  minLikes?: number;
  minRetweets?: number;
  mediaType?: MediaFilter;
  replies?: "exclude";
};

export type PostFeed =
  | { kind: "search"; query: string; sort: SearchSort; filters: SearchFilters }
  | { kind: "userPosts"; user: string }
  | { kind: "mentions"; user: string }
  | { kind: "replies"; post: string }
  | { kind: "quotes"; post: string }
  | { kind: "thread"; post: string };

export type FeedRequest = { path: string; query: Query };

export type FeedPage = { posts: Post[]; nextCursor: string | undefined };

export type AdvancedSearchValues = {
  query: string;
  from: string;
  mentioning: string;
  language: string;
  since: Date | null;
  until: Date | null;
  minLikes: string;
  minReposts: string;
  media: string;
  sort: string;
  excludeReplies: boolean;
};

const PAGE_SIZE = 20;

// The API answers 400 without q, even when filters narrow the search. This bound predates X, so it matches every post.
const EVERY_POST = "since:2006-03-21";

const userPath = (user: string, route: string) => `/x/users/${encodeURIComponent(user)}/${route}`;
const postPath = (post: string, route: string) => `/x/tweets/${encodeURIComponent(post)}/${route}`;

const FEED_ROUTES: { [K in PostFeed["kind"]]: (feed: Extract<PostFeed, { kind: K }>) => FeedRequest } = {
  search: ({ query, sort, filters }) => ({
    path: "/x/tweets/search",
    query: { q: query || EVERY_POST, queryType: sort, ...filters, limit: PAGE_SIZE },
  }),
  userPosts: ({ user }) => ({ path: userPath(user, "tweets"), query: { limit: PAGE_SIZE } }),
  mentions: ({ user }) => ({ path: userPath(user, "mentions"), query: { limit: PAGE_SIZE } }),
  replies: ({ post }) => ({ path: postPath(post, "replies"), query: { limit: PAGE_SIZE } }),
  quotes: ({ post }) => ({ path: postPath(post, "quotes"), query: { limit: PAGE_SIZE } }),
  thread: ({ post }) => ({ path: postPath(post, "thread"), query: { limit: PAGE_SIZE } }),
};

export function feedRequest(feed: PostFeed): FeedRequest {
  const route = FEED_ROUTES[feed.kind] as (feed: PostFeed) => FeedRequest;
  return route(feed);
}

export async function fetchFeedPage(feed: PostFeed, cursor?: string): Promise<FeedPage> {
  const { path, query } = feedRequest(feed);
  const page = await request(postPageSchema, path, { query: { ...query, cursor } });
  const nextCursor = page.has_next_page ? page.next_cursor || undefined : undefined;
  // The contract lets a page come back empty and still report more rows.
  if (page.tweets.length === 0 && nextCursor) return fetchFeedPage(feed, nextCursor);
  return { posts: page.tweets, nextCursor };
}

export function fetchPost(post: string): Promise<Post> {
  return request(postLookupSchema, `/x/tweets/${encodeURIComponent(post)}`);
}

export function feedKey(feed: PostFeed): string {
  return JSON.stringify(feed);
}

// A pinned post leads the first page and can come back on a later one, and React keys must stay unique.
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

const localDay = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

export function advancedFeed(values: AdvancedSearchValues): Extract<PostFeed, { kind: "search" }> | undefined {
  const criteria: SearchFilters = {
    fromUser: values.from.trim() || undefined,
    mentioning: values.mentioning.trim() || undefined,
    language: values.language.trim() || undefined,
    sinceDate: values.since ? localDay(values.since) : undefined,
    untilDate: values.until ? localDay(values.until) : undefined,
    minLikes: values.minLikes.trim() ? Number(values.minLikes) : undefined,
    minRetweets: values.minReposts.trim() ? Number(values.minReposts) : undefined,
    mediaType: (values.media || undefined) as MediaFilter | undefined,
  };
  const query = values.query.trim();
  if (!query && Object.values(criteria).every((value) => value === undefined)) return undefined;
  return {
    kind: "search",
    query,
    sort: values.sort as SearchSort,
    filters: { ...criteria, replies: values.excludeReplies ? "exclude" : undefined },
  };
}
