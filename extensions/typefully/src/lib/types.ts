import type { DraftStatus, PlatformKey } from "./constants";

export type ApiErrorDetail = {
  message: string;
  field?: string | null;
  type?: string | null;
  loc?: unknown[] | null;
  ctx?: Record<string, unknown> | null;
  input?: unknown | null;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | null;
  };
};

export type PagedResponse<T> = {
  results: T[];
  count: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
};

export type Team = {
  id: string;
  name: string;
};

export type SocialSetListItem = {
  id: number;
  username: string;
  name: string;
  profile_image_url: string;
  team?: Team | null;
};

export type PlatformAccount = Record<string, unknown>;

export type PlatformsDict = {
  x: PlatformAccount | null;
  linkedin: PlatformAccount | null;
  mastodon: PlatformAccount | null;
  threads: PlatformAccount | null;
  bluesky: PlatformAccount | null;
};

export type SocialSetDetail = SocialSetListItem & {
  platforms: PlatformsDict;
};

export type Tag = {
  slug: string;
  name: string;
  created_at: string;
};

export type Post = {
  text: string;
  media_ids?: string[];
};

export type DraftPlatform = {
  enabled: true;
  posts: Post[];
  settings?: Record<string, unknown> | null;
};

export type DraftCreatePlatforms = Partial<Record<PlatformKey, DraftPlatform | { enabled: false } | null>>;

export type DraftCreateRequest = {
  platforms: DraftCreatePlatforms;
  draft_title?: string | null;
  scratchpad_text?: string | null;
  tags?: string[];
  share?: boolean;
  publish_at?: string | null;
};

export type DraftUpdateRequest = {
  platforms?: DraftCreatePlatforms;
  draft_title?: string | null;
  scratchpad_text?: string | null;
  tags?: string[] | null;
  share?: boolean | null;
  publish_at?: string | null;
};

export type DraftDetailPlatform = {
  enabled: boolean;
  posts: Post[];
  settings?: Record<string, unknown> | null;
};

export type DraftDetail = {
  id: number;
  social_set_id: number;
  status: DraftStatus;
  preview: string;
  private_url: string;
  share_url?: string | null;
  draft_title?: string | null;
  platforms?: Partial<Record<PlatformKey, DraftDetailPlatform | null>> | null;
  scratchpad_text?: string | null;
  tags?: string[];
  created_at?: string;
  updated_at?: string | null;
  published_at?: string | null;
  scheduled_date?: string | null;
  x_published_url?: string | null;
  linkedin_published_url?: string | null;
  threads_published_url?: string | null;
  bluesky_published_url?: string | null;
  mastodon_published_url?: string | null;
};

export type MediaUrls = {
  small?: string;
  medium?: string;
  large?: string;
  original?: string;
};

export type MediaStatus = {
  media_id: string;
  file_name: string;
  mime: string;
  status: string;
  media_urls?: MediaUrls;
};

export type DraftListItem = {
  id?: number | null;
  social_set_id: number;
  status: DraftStatus;
  draft_title?: string | null;
  preview?: string | null;
  private_url: string;
  share_url?: string | null;
  tags: string[];
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  scheduled_date?: string | null;
};
