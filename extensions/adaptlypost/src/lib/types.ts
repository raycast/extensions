export type Platform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "THREADS"
  | "TIKTOK"
  | "TWITTER"
  | "BLUESKY"
  | "LINKEDIN"
  | "PINTEREST"
  | "YOUTUBE"
  | "MASTODON"
  | "TELEGRAM"
  | "GOOGLE_BUSINESS"
  | "TUMBLR"
  | "WORDPRESS";

export type SocialAccount = {
  id: string;
  platform: Platform;
  displayName: string;
  username: string;
  avatarUrl: string;
  status: "active" | "unauthorized";
  unauthorizedReason?: string;
};

export type PostStatus = "DRAFT" | "SCHEDULED" | "PENDING" | "PUBLISHING" | "COMPLETED" | "PARTIAL_FAILURE" | "FAILED";

export type PlatformPostStatus = "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

export type PostPlatform = {
  id: string;
  platform: Platform;
  status: PlatformPostStatus;
  accountName?: string;
  postUrl?: string;
  errorMessage?: string;
  publishedAt?: string;
  previewUrls: string[];
};

export type Post = {
  id: string;
  createdAt: string;
  contentType: "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL" | "DOCUMENT";
  text?: string;
  scheduledAt?: string;
  status: PostStatus;
  thumbnailUrl?: string;
  mediaUrls: string[];
  platforms: PostPlatform[];
};

export type PostList = {
  posts: Post[];
  total: number;
  hasMore: boolean;
};

export type ListPostsQuery = {
  limit: number;
  offset: number;
  statuses?: PostStatus[];
};

export type CreatePostBody = {
  contentType: "TEXT";
  text: string;
  accountIds: string[];
  timezone: string;
  saveAsDraft?: boolean;
  scheduledAt?: string;
};

export type CreatePostResult = {
  postId: string;
  queuedPlatforms: Platform[];
  skippedPlatforms: { platform: Platform; reason: string }[];
  isScheduled: boolean;
  scheduledAt?: string;
};

export type PostIssue = {
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
  platform?: Platform;
};

export type PostValidationReport = {
  valid: boolean;
  outcome: "DRAFT" | "SCHEDULED" | "PUBLISH_NOW";
  issues: PostIssue[];
  accounts: {
    platform: Platform;
    accountName?: string;
    status: "READY" | "WARNING" | "BLOCKED";
    issues: PostIssue[];
  }[];
};
