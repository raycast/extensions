export const DEFAULT_SOCIAL_SET_STORAGE_KEY = "default-social-set-id";
export const LAST_SOCIAL_SET_STORAGE_KEY = "last-social-set-id";
export const PLATFORM_SELECTIONS_STORAGE_KEY = "platform-selections-by-social-set";
export const TYPEFULLY_API_SETTINGS_URL = "https://typefully.com/?settings=api";

export const PLATFORM_KEYS = ["x", "linkedin", "threads", "bluesky", "mastodon"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  x: "X",
  linkedin: "LinkedIn",
  mastodon: "Mastodon",
  threads: "Threads",
  bluesky: "Bluesky",
};

export const THREAD_PLATFORMS = new Set<PlatformKey>(["x", "threads", "bluesky", "mastodon"]);

export type DraftStatus = "draft" | "scheduled" | "published" | "publishing" | "error";

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  publishing: "Publishing",
  error: "Error",
};

export const DRAFT_STATUS_OPTIONS: Array<{
  value: "all" | DraftStatus;
  title: string;
}> = [
  { value: "all", title: "All" },
  { value: "draft", title: "Draft" },
  { value: "scheduled", title: "Scheduled" },
  { value: "published", title: "Published" },
  { value: "publishing", title: "Publishing" },
  { value: "error", title: "Error" },
];
