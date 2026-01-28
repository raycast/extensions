import path from "node:path";
import { environment } from "@raycast/api";

import type { AvatarType } from "@/types";

export const CACHE_KEY = {
  CONFLUENCE_CURRENT_USER: "confluence_current_user",
  JIRA_CURRENT_USER: "jira_current_user",
  JIRA_SELECTED_FIELDS: "jira_selected_fields",
  JIRA_SELECTED_BOARD_ID: "jira_selected_board_id",
  JIRA_SELECTED_BOARD_TYPE: "jira_selected_board_type",
  JIRA_SELECTED_BOARD_SPRINT_ID: "jira_selected_board_sprint_id",
  JIRA_NOTIFICATION_AVAILABLE: "jira_notification_available",
  AVATAR_CONFLUENCE_USER: "avatar_confluence_user",
  AVATAR_CONFLUENCE_SPACE: "avatar_confluence_space",
  AVATAR_JIRA_USER: "avatar_jira_user",
} as const;

export const DEFAULT_AVATAR = "avatar-default.svg";

export const AVATAR_TYPE = {
  CONFLUENCE_USER: "confluence_user",
  CONFLUENCE_SPACE: "confluence_space",
  JIRA_USER: "jira_user",
} as const;

export const AVATAR_TYPE_CACHE_KEY_MAP = {
  [AVATAR_TYPE.CONFLUENCE_USER]: CACHE_KEY.AVATAR_CONFLUENCE_USER,
  [AVATAR_TYPE.CONFLUENCE_SPACE]: CACHE_KEY.AVATAR_CONFLUENCE_SPACE,
  [AVATAR_TYPE.JIRA_USER]: CACHE_KEY.AVATAR_JIRA_USER,
} as const satisfies Record<AvatarType, string>;

export const CACHE_DIR = {
  // avatar directories
  [AVATAR_TYPE.CONFLUENCE_USER]: path.resolve(environment.supportPath, "avatar-confluence-user"),
  [AVATAR_TYPE.CONFLUENCE_SPACE]: path.resolve(environment.supportPath, "avatar-confluence-space"),
  [AVATAR_TYPE.JIRA_USER]: path.resolve(environment.supportPath, "avatar-jira-user"),
  // other directories
  API_RESPONSE: path.resolve(environment.supportPath, "api-response"),
} as const;
