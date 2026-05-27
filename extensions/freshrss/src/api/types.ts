
export type Feed = {
  id: string;
  title: string;
  url?: string;
  htmlUrl?: string;
  iconUrl?: string;
  categories?: { id: string; label: string }[];
};

export type Article = {
  id: string;
  title: string;
  url: string;
  feedId?: string;
  feedTitle?: string;
  feedIconUrl?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  summary?: string;
  content?: string;
  isRead?: boolean;
  isStarred?: boolean;
};

export type ArticleListMode = "unread" | "read" | "starred" | "mixed";

export type ArticleFetchResult = {
  articles: Article[];
  continuation?: string;
};

export type Category = {
  id: string;
  label: string;
  type?: string;
  unreadCount?: number;
};

// FreshRSS API response types

export type FreshRSSAuthResponse = string;

export type FreshRSSSubscription = {
  id: string;
  title: string;
  categories: { id: string; label: string }[];
  url?: string;
  htmlUrl?: string;
  iconUrl?: string;
  "frss:priority"?: number;
};

export type FreshRSSSubscriptionListResponse = {
  subscriptions: FreshRSSSubscription[];
};

export type FreshRSSQuickAddResponse = {
  numResults: number;
  query?: string;
  streamId?: string;
  streamName?: string;
  error?: string;
};

export type FreshRSSStreamItem = {
  id: string;
  categories: string[];
  title: string;
  published: number;
  updated: number;
  author?: string;
  alternate?: { href: string; type: string }[];
  content?: { direction: string; content: string };
  summary?: { direction: string; content: string };
  origin?: { streamId: string; title: string; htmlUrl: string };
  crawlTimeMsec: string;
  timestampUsec: string;
};

export type FreshRSSStreamContentsResponse = {
  id: string;
  updated: number;
  continuation?: string;
  items: FreshRSSStreamItem[];
};

export type FreshRSSUnreadCountEntry = {
  id: string;
  count: number;
  newestItemTimestampUsec: string;
};

export type FreshRSSUnreadCountResponse = {
  max: number;
  unreadcounts: FreshRSSUnreadCountEntry[];
};

export type FreshRSSTagListEntry = {
  id: string;
  type?: string;
  label?: string;
  unread_count?: number;
};

export type FreshRSSTagListResponse = {
  tags: FreshRSSTagListEntry[];
};

