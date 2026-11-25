export type KeywordStatus = "PENDING" | "ACTIVE" | "DISABLED" | "SUSPENDED";

export type Keyword = {
  id: string;
  websiteId: string;
  value: string;
  status: KeywordStatus;
};

export type Website = {
  id: string;
  domain: string;
  url: string;
  name?: string | null;
  description?: string | null;
  keywords: Keyword[];
};

export type MentionSource =
  "REDDIT_POST" | "REDDIT_COMMENT" | "TWITTER" | "BLUESKY" | "HACKERNEWS" | "FACEBOOK" | "FACEBOOK_GROUP";

export type MentionStatus = "NEW" | "REJECTED" | "APPROVED";

export type MentionSort = "RELEVANCE" | "RECENT";

export type Mention = {
  id: string;
  websiteId: string;
  source: MentionSource;
  keyword?: string | null;
  title?: string | null;
  contentText?: string | null;
  url?: string | null;
  author?: string | null;
  subreddit?: string | null;
  status: MentionStatus;
  relevanceScore?: number | null;
  relevanceReason?: string | null;
  aiReplySuggestion?: string | null;
  tags?: string[];
  publishedAt?: string | null;
};

export type MentionList = {
  mentions: Mention[];
  total: number;
  limit: number;
  offset: number;
};

export type ListMentionsQuery = {
  websiteId?: string;
  statuses?: MentionStatus[];
  sort: MentionSort;
  limit: number;
  offset: number;
};
