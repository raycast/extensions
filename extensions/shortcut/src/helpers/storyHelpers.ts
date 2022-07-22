import { Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { Member } from "@useshortcut/client";

export function getOwnersAccessoryItems(owners: (Member | undefined)[]) {
  return [
    ...owners.filter(Boolean).map(
      (owner) =>
        ({
          icon: getMemberAvatar(owner!),
          tooltip: owner?.profile?.name,
        } as List.Item.Accessory)
    ),

    owners.length === 0 &&
      ({
        icon: Icon.Person,
        tooltip: "No owners",
      } as List.Item.Accessory),
  ].filter(Boolean);
}

export function getMemberAvatar(member: Member): Image.ImageLike {
  if (member.profile?.display_icon?.url) {
    return {
      source: member.profile?.display_icon.url,
      mask: Image.Mask.Circle,
    };
  } else {
    return getAvatarIcon(member.profile.name || member.profile.mention_name);
  }
}
