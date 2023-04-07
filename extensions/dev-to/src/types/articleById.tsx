export interface ArticleById {
  body_html: string;
  body_markdown: string;
  canonical_url: string;
  collection_id: number;
  comments_count: number;
  cover_image: string;
  created_at: Date;
  crossposted_at: null;
  description: string;
  edited_at: null;
  id: number;
  last_comment_at: Date;
  organization: Organization;
  path: string;
  positive_reactions_count: number;
  public_reactions_count: number;
  published_at: Date;
  published_timestamp: Date;
  readable_publish_date: string;
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

export interface Organization {
  name: string;
  profile_image: string;
  profile_image_90: string;
  slug: string;
  username: string;
}

export interface User {
  github_username: string;
  name: string;
  profile_image: string;
  profile_image_90: string;
  twitter_username: string;
  user_id: number;
  username: string;
  website_url: string;
}
