export const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "x",
  "pinterest",
  "bluesky",
  "threads",
  "mastodon",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
  pinterest: "Pinterest",
  bluesky: "Bluesky",
  threads: "Threads",
  mastodon: "Mastodon",
};

export const PLATFORM_ICONS: Record<Platform, string> = {
  instagram: "instagram.png",
  facebook: "facebook.png",
  linkedin: "linkedin.png",
  youtube: "youtube.png",
  tiktok: "tiktok.png",
  x: "x.png",
  pinterest: "pinterest.png",
  bluesky: "bluesky.png",
  threads: "threads.png",
  mastodon: "mastodon.png",
};

export const POST_TYPES = ["post", "story", "reel"] as const;

export const POST_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
};

export const POST_TYPE_ICONS: Record<string, string> = {
  post: "document-16",
  story: "camera-16",
  reel: "video-16",
};

export const POST_STATUSES = [
  "draft",
  "scheduled",
  "posted",
  "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const STATUS_ICONS: Record<string, string> = {
  draft: "pencil-16",
  scheduled: "clock-16",
  posted: "checkmark-circle-16",
  failed: "xmark-circle-16",
  warning: "exclamationmark-triangle-16",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  scheduled: "#F59E0B",
  posted: "#10B981",
  failed: "#EF4444",
  warning: "#F97316",
};
