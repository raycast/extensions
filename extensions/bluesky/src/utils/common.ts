import { Account, AllowedActionKeys } from "../types/types";
import { Icon, Toast, showToast } from "@raycast/api";

import { ActionMap } from "../config/actionMap";
import { BlueskyProfileUrlBase } from "./constants";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import crypto from "crypto";
import { getRKey } from "../libs/atp";

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

export const getFormattedActionShortcut = (actionKey: AllowedActionKeys) => {
  const action = ActionMap[actionKey];
  const shortcut = action.shortcut;

  return `\`${shortcut.modifiers.map(formatModifier).join(" + ")} + ${shortcut.key}\``;
};

export const getPostUrl = (handle: string, uri: string) => {
  return `${BlueskyProfileUrlBase}/${handle}/post/${getRKey(uri)}`;
};

export const getAccountName = (account: Account | ProfileViewDetailed) => {
  return account.displayName || account.handle;
};

export const getAccountIcon = (account: Account) => {
  return account.avatarUrl ? account.avatarUrl : Icon.ChessPiece;
};

export const getAuthorDetailsMarkdown = (author: ProfileViewDetailed): string => {
  const displayNameText = author.displayName ? `**${author.displayName.trim()}**` : "";

  return `
${displayNameText} _[(${author.handle})](${BlueskyProfileUrlBase}/${author.handle})_

${author.description ? author.description : ""}
`;
};
