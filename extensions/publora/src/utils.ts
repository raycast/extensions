import { Toast, showToast } from "@raycast/api";

export const PLATFORM_LIMITS = {
  twitter: 280,
  bluesky: 300,
  threads: 500,
} as const;

export type PlatformName = keyof typeof PLATFORM_LIMITS;

/**
 * Check if a platform is selected in the platforms array
 */
export const hasPlatform = (platforms: string[] | undefined, platformName: string): boolean => {
  return platforms?.findIndex((v) => v.startsWith(platformName)) !== -1;
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
  const twitterError = validatePlatformLength(content, platforms, "twitter", "X");
  if (twitterError) return twitterError;

  const blueskyError = validatePlatformLength(content, platforms, "bluesky", "Bluesky");
  if (blueskyError) return blueskyError;

  const threadsError = validatePlatformLength(content, platforms, "threads", "Threads");
  if (threadsError) return threadsError;

  return undefined;
};
