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
}
