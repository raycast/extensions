export const DEFAULT_SOCIAL_SET_STORAGE_KEY = "default-social-set-id";
export const LAST_SOCIAL_SET_STORAGE_KEY = "last-social-set-id";
export const PLATFORM_SELECTIONS_STORAGE_KEY = "platform-selections-by-social-set";
export const POSTEY_API_SETTINGS_URL = "https://app.postey.ai/?settings=api";

export const PLATFORM_KEYS = ["X", "LINKEDIN"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  X: "X",
  LINKEDIN: "LinkedIn",
};
export const THREAD_PLATFORMS = new Set<PlatformKey>(["X"]);

export function getPlatformLabel(platform: string) {
  const normalized = platform.toUpperCase() as PlatformKey;
  return normalized in PLATFORM_LABELS ? PLATFORM_LABELS[normalized] : platform;
}

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
