import { Icon, type Image } from "@raycast/api";

import { PLATFORM, type Connection, type Platform } from "./types";

/** Display name and brand color (literal hex) per platform. */
const PLATFORM_INFO: Record<Platform, { name: string; color: string }> = {
  [PLATFORM.Instagram]: { name: "Instagram", color: "#E1306C" },
  [PLATFORM.TikTok]: { name: "TikTok", color: "#25F4EE" },
  [PLATFORM.YouTube]: { name: "YouTube", color: "#FF0000" },
  [PLATFORM.Facebook]: { name: "Facebook", color: "#1877F2" },
  [PLATFORM.Snapchat]: { name: "Snapchat", color: "#FFFC00" },
  [PLATFORM.Pinterest]: { name: "Pinterest", color: "#E60023" },
  [PLATFORM.Threads]: { name: "Threads", color: "#8E8E93" },
  [PLATFORM.Twitter]: { name: "X", color: "#8E8E93" },
  [PLATFORM.Bluesky]: { name: "Bluesky", color: "#1185FE" },
  [PLATFORM.LinkedIn]: { name: "LinkedIn", color: "#0A66C2" },
  [PLATFORM.Reddit]: { name: "Reddit", color: "#FF4500" },
  [PLATFORM.Telegram]: { name: "Telegram", color: "#26A5E4" },
  [PLATFORM.Mastodon]: { name: "Mastodon", color: "#6364FF" },
  [PLATFORM.Discord]: { name: "Discord", color: "#5865F2" },
  [PLATFORM.Tumblr]: { name: "Tumblr", color: "#36465D" },
  [PLATFORM.Pixelfed]: { name: "Pixelfed", color: "#6366F1" },
  [PLATFORM.GoogleBusiness]: { name: "Google Business Profile", color: "#4285F4" },
  [PLATFORM.Dailymotion]: { name: "Dailymotion", color: "#0D0D0D" },
  [PLATFORM.WordPress]: { name: "WordPress", color: "#21759B" },
  [PLATFORM.WhatsApp]: { name: "WhatsApp", color: "#25D366" },
  [PLATFORM.Ghost]: { name: "Ghost", color: "#15171A" },
  [PLATFORM.Blogger]: { name: "Blogger", color: "#FF5722" },
  [PLATFORM.Vimeo]: { name: "Vimeo", color: "#1AB7EA" },
};

export function platformName(platform: string): string {
  return PLATFORM_INFO[platform as Platform]?.name ?? platform;
}

export function platformIcon(platform: string): Image.ImageLike {
  const color = PLATFORM_INFO[platform as Platform]?.color;
  return color ? { source: Icon.CircleFilled, tintColor: color } : Icon.Circle;
}

/** "Instagram (@acme)" style label for a connected account. */
export function connectionLabel(connection: Pick<Connection, "platform" | "display_name">): string {
  const name = platformName(connection.platform);
  return connection.display_name ? `${name}: ${connection.display_name}` : name;
}

/** Platforms that can't take a text-only post (they need an image or video). */
export const MEDIA_REQUIRED_PLATFORMS: readonly string[] = [
  PLATFORM.TikTok,
  PLATFORM.YouTube,
  PLATFORM.Instagram,
  PLATFORM.Pinterest,
  PLATFORM.Snapchat,
  PLATFORM.Dailymotion,
  PLATFORM.Vimeo,
];

/** Platforms that take only video. */
export const VIDEO_ONLY_PLATFORMS: readonly string[] = [PLATFORM.YouTube, PLATFORM.Dailymotion, PLATFORM.Vimeo];

/** Platforms whose post needs a title; the caption's first line is used when none is given. */
export const TITLE_PLATFORMS: Partial<Record<Platform, number>> = {
  [PLATFORM.YouTube]: 100,
  [PLATFORM.Reddit]: 300,
};

/** Platforms that read a title when one is given. */
export const OPTIONAL_TITLE_PLATFORMS: readonly string[] = [
  PLATFORM.Pinterest,
  PLATFORM.Tumblr,
  PLATFORM.WordPress,
  PLATFORM.Ghost,
  PLATFORM.Blogger,
];

/** Platforms that ignore the caption and read title + description instead. */
export const DESCRIPTION_PLATFORMS: readonly string[] = [PLATFORM.YouTube];
