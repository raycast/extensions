// --- Bookface Feed types ---

export interface FeedResponse {
  posts: FeedPost[];
  items: unknown[];
  meta: Record<string, unknown>;
  channels: string[];
  feed_content_options: Record<string, unknown>;
}

export interface FeedPost {
  id: number;
  title: string;
  body: string;
  body_v2?: string;
  body_preview?: string;
  feed_preview?: string;
  user: FeedPostUser;
  comment_count: number;
  views_count: number;
  channel: string;
  url: string;
  created_at: string;
  slug: string;
  all_tags: string[];
  vote_info: {
    count: number;
    current_user_vote?: { id: number; direction: string } | null;
  };
  pinned_at?: string;
}

export interface FeedPostUser {
  id: number;
  full_name: string;
  avatar_thumb?: string;
  slug?: string;
  company_name?: string;
  batch_name?: string;
}

// --- Auth ---

export interface AuthSession {
  ssoKey: string;
  algoliaKey?: string;
  expiresAt: number;
}
