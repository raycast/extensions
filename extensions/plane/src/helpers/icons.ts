import { Color, Icon, Image } from "@raycast/api";
import { PriorityEnum, State, UserLite } from "@makeplane/plane-node-sdk";
import { getAvatarIcon } from "@raycast/utils";

export const getStateIcon = (state: State): Image.ImageLike => {
  return { source: Icon.Circle, tintColor: state.color };
};

export const priorityToIcon = (priority: PriorityEnum): Image.ImageLike => {
  switch (priority) {
    case PriorityEnum.None:
      return { source: Icon.Signal0, tintColor: Color.SecondaryText };
    case PriorityEnum.Low:
      return { source: Icon.Signal1, tintColor: Color.Yellow };
    case PriorityEnum.Medium:
      return { source: Icon.Signal2, tintColor: Color.Orange };
    case PriorityEnum.High:
      return { source: Icon.Signal3, tintColor: Color.Red };
    case PriorityEnum.Urgent:
      return { source: Icon.FullSignal, tintColor: Color.Red };
  }
};

export const getUserLogo = (user: UserLite): Image.ImageLike => {
  if (user) {
    return {
      source: user.avatarUrl ? encodeURI(user.avatarUrl) : getAvatarIcon(user?.displayName || "User"),
    };
  }
  return getAvatarIcon("User");
};
