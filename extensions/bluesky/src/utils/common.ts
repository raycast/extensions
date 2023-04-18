import { Cache, Toast, showToast } from "@raycast/api";

import { ActionMap } from "../config/actionMap";
import { AllowedActionKeys } from "../types/types";
import { ProfileCacheKey } from "./constants";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import crypto from "crypto";

export const showLoadingToast = async (message: string) => {
  await showToast({
    style: Toast.Style.Animated,
    title: message,
  });
};

export const buildTitle = (previousTitle: string, newTitle: string) => {
  if (!previousTitle) return newTitle;

  return `${previousTitle}/${newTitle}`;
};

export const showSuccessToast = async (message: string) => {
  await showToast({
    style: Toast.Style.Success,
    title: message,
  });
};

export const showDangerToast = async (message: string) => {
  await showToast({
    style: Toast.Style.Failure,
    title: message,
  });
};

export const createHashKey = (value: string) => {
  const hash = crypto.createHash("sha256").update(value).digest("base64");

  return hash;
};

const formatModifier = (modifier: string) => {
  switch (modifier) {
    case "cmd":
      return "⌘";
    case "shift":
      return "Shift";
    case "opt":
      return "⌥";
    default:
      return modifier;
  }
};

export const getProfileTitle = () => {
  const cache = new Cache();
  const response = cache.get(ProfileCacheKey);
  const profile: ProfileViewDetailed = response ? JSON.parse(response) : null;
  return profile ? `${profile.displayName ? profile.displayName : profile.handle}` : null;
};

export const getFormattedActionShortcut = (actionKey: AllowedActionKeys) => {
  const action = ActionMap[actionKey];
  const shortcut = action.shortcut;

  return `\`${shortcut.modifiers.map(formatModifier).join(" + ")} + ${shortcut.key}\``;
};
