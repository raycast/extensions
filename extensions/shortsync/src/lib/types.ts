/**
 * Shapes and enums of the ShortSync public API (v1), taken from
 * https://www.shortsync.app/openapi.yaml. Only the fields this extension reads.
 */

export interface ExtensionPreferences {
  apiKey: string;
  apiBaseUrl?: string;
}

export const PUBLISH_MODE = {
  Immediate: "immediate",
  Scheduled: "scheduled",
  Draft: "draft",
} as const;
export type PublishMode = (typeof PUBLISH_MODE)[keyof typeof PUBLISH_MODE];

export const POST_STATUS = {
  Processing: "processing",
  Queued: "queued",
  Ready: "ready",
  Scheduled: "scheduled",
  Published: "published",
  Failed: "failed",
  Deleted: "deleted",
  Draft: "draft",
} as const;
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const CONNECTION_STATUS = {
  Active: "active",
  TokenExpired: "token_expired",
  RefreshFailed: "refresh_failed",
  NeedsReconnect: "needs_reconnect",
  RateLimited: "rate_limited",
} as const;
export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

export const PLATFORM = {
  Instagram: "instagram",
  TikTok: "tiktok",
  YouTube: "youtube",
  Facebook: "facebook",
  Snapchat: "snapchat",
  Pinterest: "pinterest",
  Threads: "threads",
  Twitter: "twitter",
  Bluesky: "bluesky",
  LinkedIn: "linkedin",
  Reddit: "reddit",
  Telegram: "telegram",
  Mastodon: "mastodon",
  Discord: "discord",
  Tumblr: "tumblr",
  Pixelfed: "pixelfed",
  GoogleBusiness: "google_business",
  Dailymotion: "dailymotion",
  WordPress: "wordpress",
  WhatsApp: "whatsapp",
  Ghost: "ghost",
  Blogger: "blogger",
  Vimeo: "vimeo",
} as const;
export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { next_cursor: string | null };
}

export interface Connection {
  id: string;
  workspace_id: string | null;
  platform: Platform | string;
  display_name: string | null;
  avatar_url?: string | null;
  status: ConnectionStatus | string;
  isActive?: boolean;
  connected_at: string;
  reconnect_url?: string;
}

export interface PostError {
  code?: string;
  message?: string;
}

export interface Post {
  id: string;
  workspace_id: string;
  upload_id: string | null;
  platform: Platform | string;
  connection_id: string;
  status: PostStatus | string;
  publish_mode: PublishMode | string;
  scheduled_for: string | null;
  published_at: string | null;
  platform_url: string | null;
  caption: string | null;
  title: string | null;
  description: string | null;
  error: PostError | null;
  duplicate_of?: string | null;
  skipped?: unknown;
  moved?: { original_scheduled_for: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface PostTarget {
  connection_id: string;
  title?: string;
  description?: string;
}

export interface PostCreateBody {
  upload_id?: string;
  publish_mode: PublishMode;
  scheduled_for?: string;
  caption: string;
  targets: PostTarget[];
}

export interface UploadTicket {
  upload_id: string;
  presigned_url: string;
  method: "PUT";
  expires_at: string;
  workspace_id: string;
  required_headers?: Record<string, string>;
}
