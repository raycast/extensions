export interface Preferences {
  apiKey: string;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  apiKey: string;
  icon?: string;
  baseUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PostContent {
  default: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
  pinterest?: string;
  bluesky?: string;
  threads?: string;
  mastodon?: string;
}

export interface PostMedia {
  url: string;
  id: string;
}

export interface Post {
  id: string;
  status: "draft" | "scheduled" | "posted" | "failed" | "warning";
  type: "post" | "story" | "reel";
  content: PostContent;
  accounts: string[];
  media: {
    default?: PostMedia[];
    [platform: string]: PostMedia[] | undefined;
  };
  schedule_at: string | null;
  published_urls: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  approval_status: string | null;
  errors: Record<string, string> | null;
}

export interface Account {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  content_types: string[];
  status: string;
  connected_at: string;
  boards?: { id: string; name: string }[];
  platform_details?: Record<string, unknown>;
}

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  filename: string;
  size: number;
  created_at: string;
}

export interface AnalyticsOverview {
  total_posts: number;
  total_platforms: number;
  total_engagement: number;
  total_impressions: number;
  average_engagement_rate: number;
  top_performing_platform: string;
  platform_breakdown: Record<
    string,
    {
      posts: number;
      total_engagement: number;
      total_impressions: number;
      average_engagement: number;
      engagement_rate: number;
    }
  >;
}

export interface PostAnalytics {
  post_id: string;
  platforms: Record<
    string,
    {
      platform: string;
      platform_post_id: string;
      metrics: Record<string, number>;
      collected_at: string;
    }
  >;
}

export type PostType = "post" | "story" | "reel";

export interface CreatePostRequest {
  content: PostContent;
  accounts: string[];
  type?: PostType;
  media_urls?: string[];
  schedule_at?: string;
  publish_now?: boolean;
}
