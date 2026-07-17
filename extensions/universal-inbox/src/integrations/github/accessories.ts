import { GithubActor, getGithubActorName } from "./types";
import { Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

export function getGithubActorAccessory(actor?: GithubActor): List.Item.Accessory {
  if (actor) {
    return {
      icon: actor.content.avatar_url
        ? { source: actor.content.avatar_url, mask: Image.Mask.Circle }
        : getAvatarIcon(getGithubActorName(actor)),
      tooltip: getGithubActorName(actor),
    };
  }
  return { icon: Icon.Person, tooltip: "Unknown" };
}
