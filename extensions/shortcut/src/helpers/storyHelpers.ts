import { useState, useEffect } from "react";
import { Color, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { Member, StorySlim } from "@useshortcut/client";

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

export function getMemberName(member: Member) {
  return member.profile.name || member.profile.mention_name;
}

export function getMemberAvatar(member: Member): Image.ImageLike {
  /**
   * !FIXME: the image url is authenticated
   * Even with ?token=xxxx the image is not displayed in Raycast
   */

  // if (member.profile?.display_icon?.url) {
  //   return {
  //     source: member.profile?.display_icon.url,
  //     mask: Image.Mask.Circle,
  //   };
  // } else {
  return getAvatarIcon(member.profile.name || member.profile.mention_name);
  // }
}

export const getStoryColor = (storyType: StorySlim["story_type"]) => {
  switch (storyType) {
    case "feature":
      return Color.Yellow;
    case "bug":
      return Color.Red;
    case "chore":
    default:
      return Color.PrimaryText;
  }
};

export const StoryTypes = ["feature", "bug", "chore"];

export const useFormField = <T>(
  initialValue: T,
  {
    validator,
    errorMessage,
  }: {
    validator?: (value: T) => boolean;
    errorMessage?: string;
  } = {}
) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();

  const validate = () => {
    if (validator && !validator(value)) {
      setError(errorMessage);

      return false;
    } else {
      setError(undefined);

      return true;
    }
  };

  const onChange = (newValue: T) => {
    setValue(newValue);

    setError(undefined);
  };

  const onBlur = () => {
    validate();
  };

  return { value, onChange, error, onBlur, validate };
};
