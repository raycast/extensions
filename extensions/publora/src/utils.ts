import { Toast, showToast } from "@raycast/api";

import { Platform } from "./types";

// X and Threads are not listed: Publora splits longer posts there into a thread
export const PLATFORM_LIMITS = {
  bluesky: 300,
  mastodon: 500,
} as const;

export type PlatformName = keyof typeof PLATFORM_LIMITS;

/**
 * Check if a platform is selected in the platforms array
 */
export const hasPlatform = (platforms: string[] | undefined, platformName: string): boolean => {
  return !!platforms?.some((v) => v.startsWith(platformName));
};

/**
 * Validate content length for a specific platform
 */
export const validatePlatformLength = (
  content: string,
  platforms: string[] | undefined,
  platformName: PlatformName,
  platformDisplayName: string,
): string | undefined => {
  const limit = PLATFORM_LIMITS[platformName];
  if (content.length > limit && hasPlatform(platforms, platformName)) {
    showToast({
      title: `Too long for ${platformDisplayName}`,
      message: `${limit} characters limit`,
      style: Toast.Style.Failure,
    });
    return `Too long for ${platformDisplayName}`;
  }
  return undefined;
};

/**
 * Comprehensive content validation for all platforms
 */
export const validateContent = (content: string | undefined, platforms: string[] | undefined): string | undefined => {
  if (!content || content.length === 0) {
    return "Content cannot be empty";
  }

  // Check each platform's character limit
  const blueskyError = validatePlatformLength(content, platforms, "bluesky", "Bluesky");
  if (blueskyError) return blueskyError;

  const mastodonError = validatePlatformLength(content, platforms, "mastodon", "Mastodon");
  if (mastodonError) return mastodonError;

  return undefined;
};

/**
 * Publora still calls X "twitter" in its API
 */
export const networkName = (platform: string): string => (platform === "twitter" ? "x" : platform);

/**
 * Tells apart several accounts on the same network
 */
export const accountTitle = (platform: Platform): string => {
  return `${networkName(platform.platformId.split("-")[0])} (${platform.displayName || platform.username})`;
};
