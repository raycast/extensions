export interface User {
  id: string;
  name: string;
  username: string;
  profile_banner_url?: string;
  profile_image_url?: string;
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
  reply_count?: number;
  retweet_count: number;
  like_count: number;
  non_public_metrics?: TweetNonPublicMetrics;
  organic_metrics?: TweetOrganicMetrics;
}

export interface TweetNonPublicMetrics {
  impression_count: number;
  url_link_clicks: number;
}

export interface TweetOrganicMetrics {
  impression_count: number;
  url_link_clicks: number;
  user_profile_clicks: number;
  retweet_count: number;
  reply_count: number;
  like_count: number;
}
