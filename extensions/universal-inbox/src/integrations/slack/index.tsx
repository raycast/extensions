import { SlackIcon, SlackUser } from "./types";

export function getSlackUserAvatarUrl(slackUser: SlackUser): string | null {
  if (!slackUser.profile) {
    return null;
  }
  if (slackUser.profile.image_24) {
    return slackUser.profile.image_24;
  }
  if (slackUser.profile.image_32) {
    return slackUser.profile.image_32;
  }
  if (slackUser.profile.image_34) {
    return slackUser.profile.image_34;
  }
  if (slackUser.profile.image_44) {
    return slackUser.profile.image_44;
  }
  if (slackUser.profile.image_48) {
    return slackUser.profile.image_48;
  }
  return null;
}

export function getSlackIconUrl(slackIcon?: SlackIcon): string | null {
  if (slackIcon?.image_24) {
    return slackIcon.image_24;
  }
  if (slackIcon?.image_32) {
    return slackIcon.image_32;
  }
  if (slackIcon?.image_34) {
    return slackIcon.image_34;
  }
  if (slackIcon?.image_44) {
    return slackIcon.image_44;
  }
  if (slackIcon?.image_48) {
    return slackIcon.image_48;
  }
  return null;
}
