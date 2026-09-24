export type Brand = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  language: string;
};

export type PostStatus = "draft" | "queued" | "scheduled" | "published" | "failed";

export type PostPart = {
  content: string | null;
  media_urls: string[];
};

export type Post = {
  id: string;
  status: PostStatus;
  caption: string | null;
  parts?: PostPart[];
  media_urls?: string[];
  scheduled_at: string | null;
  published_at?: string | null;
  release_url?: string | null;
  failure_code: string | null;
  metrics?: Record<string, number>;
  metrics_synced_at?: string | null;
  channel_id: string;
  provider: string;
};

export type PostPage = {
  posts: Post[];
  page: number;
  pages: number;
};

export type Wallet = {
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
};

export type WritingPlatform = "x" | "linkedin";

export type Variant = {
  status: "pending" | "succeeded" | "failed";
  parts?: string[];
  reason?: string;
  violation?: string | null;
};

export type TextGeneration = {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  platform: WritingPlatform;
  mode: string;
  variants: (Variant | null)[];
};
