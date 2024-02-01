import { Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { LinearUser } from "./types";

export function getLinearUserAccessory(user?: LinearUser): List.Item.Accessory {
  if (user) {
    return {
      icon: user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : getAvatarIcon(user.name),
      tooltip: user.name,
    };
  }
  return { icon: Icon.Person, tooltip: "Unknown" };
}
