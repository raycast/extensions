import { User } from "@linear/sdk";
import { Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

export function getUserIcon(user?: Pick<User, "displayName" | "avatarUrl"> | null) {
  if (user) {
    return {
      source: user.avatarUrl ? encodeURI(user.avatarUrl) : getAvatarIcon(user.displayName.toUpperCase()),
      mask: Image.Mask.Circle,
    };
  }

  return Icon.Person;
}
