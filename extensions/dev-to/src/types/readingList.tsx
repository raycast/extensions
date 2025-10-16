export interface ReadingList {
  article: Article;
  created_at: Date;
  id: number;
  status: string;
  type_of: string;
}

export interface Article {
  canonical_url: string;
  collection_id: null;
  comments_count: number;
  cover_image: null | string;
  created_at: Date;
  crossposted_at: null;
  description: string;
  edited_at: Date | null;
  id: number;
  last_comment_at: Date;
  path: string;
  positive_reactions_count: number;
  public_reactions_count: number;
  published_at: Date;
  published_timestamp: Date;
  readable_publish_date: string;
  reading_time_minutes: number;
  slug: string;
  social_image: string;
  tags: string;
  title: string;
  type_of: string;
  url: string;
  user: User;
}

export interface User {
  github_username: string;
  name: string;
  profile_image: string;
  profile_image_90: string;
  twitter_username: null | string;
  user_id: number;
  username: string;
  website_url: null | string;
}
