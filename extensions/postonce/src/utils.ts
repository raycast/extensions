import { Color, Icon, Image } from "@raycast/api";

import { Account, PostStatus } from "./types";

const PLATFORM_NAMES: Record<string, string> = {
  bluesky: "Bluesky",
  facebook: "Facebook",
  farcaster: "Farcaster",
  google_business: "Google Business",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  nostr: "Nostr",
  pinterest: "Pinterest",
  reddit: "Reddit",
  snapchat: "Snapchat",
  telegram: "Telegram",
  threads: "Threads",
  tiktok: "TikTok",
  twitter: "X",
  vimeo: "Vimeo",
  youtube: "YouTube",
};

export const platformName = (platform: string | null) => (platform ? PLATFORM_NAMES[platform] || platform : "Unknown");

export const accountTitle = (account: Pick<Account, "platform" | "username">) =>
  `${platformName(account.platform)} (${account.username})`;

export const accountIcon = (account: Pick<Account, "avatar_url">): Image.ImageLike =>
  account.avatar_url ? { source: account.avatar_url, mask: Image.Mask.Circle } : Icon.PersonCircle;

export const POST_STATUS_COLORS: Record<PostStatus, Color> = {
  queued: Color.SecondaryText,
  scheduled: Color.Blue,
  processing: Color.Purple,
  partial: Color.Orange,
  published: Color.Green,
  failed: Color.Red,
  cancelled: Color.SecondaryText,
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  queued: "Queued",
  scheduled: "Scheduled",
  processing: "Processing",
  partial: "Partly Published",
  published: "Published",
  failed: "Failed",
  cancelled: "Canceled",
};

export const canCancel = (status: PostStatus) => status === "scheduled" || status === "queued";

export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};
