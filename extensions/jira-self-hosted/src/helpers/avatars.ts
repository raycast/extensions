import { Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import { Project } from "../api/projects";
import { User } from "../api/users";

export function getUserAvatar(user?: User | null) {
  if (!user) return Icon.PersonCircle;
  if (!user.avatarUrls) {
    return getAvatarIcon(user.displayName);
  }
  return { source: user.avatarUrls["32x32"], mask: Image.Mask.Circle };
}

export function getProjectAvatar(project: Project) {
  if (!project.avatarUrls) return Icon.List;
  return { source: project.avatarUrls["32x32"], mask: Image.Mask.RoundedRectangle };
}
