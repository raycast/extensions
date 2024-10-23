export interface NewArticle {
  body_html: string;
  body_markdown: string;
  canonical_url: string;
  collection_id: null;
  comments_count: number;
  cover_image: null;
  created_at: Date;
  crossposted_at: null;
  description: string;
  edited_at: null;
  id: number;
  last_comment_at: Date;
  path: string;
  positive_reactions_count: number;
  public_reactions_count: number;
  published_at: null;
  published_timestamp: string;
  readable_publish_date: null;
  reading_time_minutes: number;
  slug: string;
  social_image: string;
  tag_list: string;
  tags: string[];
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
