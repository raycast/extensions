import { Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import type { ChromeProfile } from "../types";

/**
 * The best available icon for a profile, resolved entirely offline:
 * 1. the local Google account photo (a real file on disk), shown as a circle;
 * 2. otherwise a generated initials avatar tinted with the profile's color.
 * Never performs a network request; never throws.
 */
export function getProfileIcon(profile: ChromeProfile): Image.ImageLike {
  if (profile.avatarPath) {
    return { source: profile.avatarPath, mask: Image.Mask.Circle };
  }
  return getAvatarIcon(profile.name, { background: profile.color });
}
