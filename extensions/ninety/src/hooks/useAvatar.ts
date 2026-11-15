import { getPreferenceValues, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useMe } from "./useMe";
import { useUsers } from "./useUsers";

/**
 * A black "ME" badge for your own items, drawn like getAvatarIcon's initials but with a white ring
 * so it stands out on dark backgrounds.
 */
const ME_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px">' +
  '<circle cx="50" cy="50" r="45" fill="#000000" stroke="#FFFFFF" stroke-width="8"/>' +
  '<text x="50" y="52" font-size="40" font-weight="600" font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" fill="white">ME</text>' +
  "</svg>";
const ME_ICON = `data:image/svg+xml,${encodeURIComponent(ME_SVG)}`;

/**
 * Ninety's API has no profile photos, so people get a generated initials avatar (made locally, no
 * network request). Your own items show "Your Avatar URL" if it's set, or a black "ME" badge.
 */
export function useAvatar() {
  const url = getPreferenceValues<Preferences>().avatarUrl?.trim();
  const { userId } = useMe({ silent: true });
  const { userName } = useUsers();
  const myName = userId ? userName(userId) : undefined;

  /**
   * `ownerId` decides whether the item is yours, so a coworker with your name keeps their initials.
   * Only the team Scorecard leaves it out (Ninety returns just the owner's name there), and then
   * the name is compared instead.
   */
  const isMe = (name: string, ownerId?: string) => (ownerId ? ownerId === userId : name === myName);

  const avatar = (name?: string, ownerId?: string): Image.ImageLike | undefined => {
    if (!name) return undefined;
    if (!isMe(name, ownerId)) return getAvatarIcon(name);
    return url ? { source: url, mask: Image.Mask.Circle, fallback: ME_ICON } : ME_ICON;
  };
  const ownerAccessory = (name?: string, ownerId?: string): List.Item.Accessory | undefined =>
    name ? { icon: avatar(name, ownerId), tooltip: name } : undefined;

  return { avatar, ownerAccessory };
}
