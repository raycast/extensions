import { Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import { Collaborator, SyncData, User } from "../api";

export function getProjectCollaborators(projectId: string, data?: SyncData) {
  if (!data) {
    return [];
  }

  const projectCollaborators = data.collaborator_states
    ?.filter((state) => state.project_id === projectId)
    .map((state) => state.user_id);

  return data.collaborators.filter((collaborator) => projectCollaborators?.includes(collaborator.id));
}

export function getCollaboratorIcon(collaborator: Collaborator): Image.ImageLike {
  return collaborator.image_id
    ? { source: `https://dcff1xvirvpfp.cloudfront.net/${collaborator.image_id}_medium.jpg`, mask: Image.Mask.Circle }
    : getAvatarIcon(collaborator.full_name);
}

export function getUserIcon(user: User): Image.ImageLike {
  return user.avatar_medium ? { source: user.avatar_medium, mask: Image.Mask.Circle } : getAvatarIcon(user.full_name);
}
