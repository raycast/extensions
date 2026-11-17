export type AccountStatus = "active" | "auth_required" | "disconnected";

export interface Account {
  id: string;
  platform: string;
  username: string;
  avatar_url: string | null;
  status: AccountStatus;
}

export type PostStatus = "queued" | "scheduled" | "processing" | "partial" | "published" | "failed" | "cancelled";

export type TargetStatus =
  "pending" | "scheduled" | "processing" | "submitted" | "published" | "failed" | "skipped" | "cancelled";

export interface PostTarget {
  target_post_id: string;
  account_id: string | null;
  platform: string | null;
  username: string | null;
  status: TargetStatus;
  error: string | null;
  platform_post_url: string | null;
}

export interface Post {
  id: string;
  content: string;
  media?: { url: string }[];
  publish_at: string | null;
  status: PostStatus;
  created_at: string | null;
  targets: PostTarget[];
}

export interface CreatePostInput {
  content?: string;
  media?: { url: string }[];
  publish_at?: string;
  targets: { account_id: string }[];
}

export interface ListResponse<T> {
  data: T[];
  meta?: { next_cursor?: string | null };
}
