export interface Article {
  body_markdown: string;
  canonical_url: string;
  comments_count: number;
  cover_image: null;
  description: string;
  id: number;
  page_views_count: number;
  path: string;
  positive_reactions_count: number;
  public_reactions_count: number;
  published: boolean;
  published_at: Date;
  published_timestamp: Date;
  reading_time_minutes: number;
  slug: string;
  tag_list: string[];
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
  twitter_username: null;
  user_id: number;
  username: string;
  website_url: null;
}
