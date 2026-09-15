export interface User {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  location?: string;
  profile_banner_url?: string;
  profile_image_url?: string;
  protected?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
    like_count?: number;
    media_count?: number;
  };
  url?: string;
  verified?: boolean;
}

export interface Tweet {
  id: string;
  text: string;
  source: string;
  created_at: string | undefined;
  conversation_id: string | undefined;
  image_url?: string | undefined;
  user: User;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
  reply_count?: number;
  retweet_count: number;
  like_count: number;
  video_view_count?: number;
  video_playback_count?: number;
  non_public_metrics?: TweetNonPublicMetrics;
  organic_metrics?: TweetOrganicMetrics;
}

/** Keep the first occurrence in feed order when paginated results overlap. */
export function deduplicateById<T extends { id: string }>(items: readonly T[] | undefined): T[] {
  const seen = new Set<string>();
  return (items ?? []).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Match a batch lookup to the source page's order and omit inaccessible items. */
export function orderByRequestedIds<T extends { id: string }>(ids: readonly string[], items: readonly T[]): T[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}

export interface TweetNonPublicMetrics {
  impression_count: number;
  url_link_clicks: number;
  user_profile_clicks: number;
}

export interface TweetOrganicMetrics {
  impression_count: number;
  url_link_clicks: number;
  user_profile_clicks: number;
  retweet_count: number;
  reply_count: number;
  like_count: number;
}
