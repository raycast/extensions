import type { ConfluenceSpaceType, ConfluenceIconType, ConfluenceLabelType, ListItemIcon } from "@/types";

export const CONFLUENCE_USER_STATUS = {
  CURRENT: "current",
  INACTIVE: "inactive",
  DEACTIVATED: "deactivated",
} as const;

export const CONFLUENCE_ENTITY_TYPE = {
  CONTENT: "content",
  SPACE: "space",
  USER: "user",
  GROUP: "group",
} as const;

export const CONFLUENCE_CONTENT_TYPE = {
  PAGE: "page",
  BLOGPOST: "blogpost",
  ATTACHMENT: "attachment",
  COMMENT: "comment",
} as const;

export const CONFLUENCE_SPACE_TYPE = {
  PERSONAL: "personal",
  GLOBAL: "global",
  FAVOURITE: "favourite",
} as const;

export const CONFLUENCE_TYPE_ICON = {
  [CONFLUENCE_ENTITY_TYPE.CONTENT]: "icon-content.svg",
  [CONFLUENCE_ENTITY_TYPE.SPACE]: "icon-space.svg",
  [CONFLUENCE_ENTITY_TYPE.USER]: "icon-user.svg",
  [CONFLUENCE_ENTITY_TYPE.GROUP]: "icon-group.svg",
  [CONFLUENCE_CONTENT_TYPE.PAGE]: "icon-page.svg",
  [CONFLUENCE_CONTENT_TYPE.BLOGPOST]: "icon-blogpost.svg",
  [CONFLUENCE_CONTENT_TYPE.ATTACHMENT]: "icon-attachment.svg",
  [CONFLUENCE_CONTENT_TYPE.COMMENT]: "icon-comment.svg",
} as const satisfies Record<ConfluenceIconType, ListItemIcon>;

export const CONFLUENCE_TYPE_LABEL = {
  [CONFLUENCE_ENTITY_TYPE.CONTENT]: "Content",
  [CONFLUENCE_ENTITY_TYPE.SPACE]: "Space",
  [CONFLUENCE_ENTITY_TYPE.USER]: "User",
  [CONFLUENCE_ENTITY_TYPE.GROUP]: "Group",
  [CONFLUENCE_CONTENT_TYPE.PAGE]: "Page",
  [CONFLUENCE_CONTENT_TYPE.BLOGPOST]: "Blog",
  [CONFLUENCE_CONTENT_TYPE.ATTACHMENT]: "Attachment",
  [CONFLUENCE_CONTENT_TYPE.COMMENT]: "Comment",
} as const satisfies Record<ConfluenceLabelType, string>;

export const CONFLUENCE_SPACE_TYPE_LABEL = {
  [CONFLUENCE_SPACE_TYPE.PERSONAL]: "Personal Space",
  [CONFLUENCE_SPACE_TYPE.GLOBAL]: "Global Space",
  [CONFLUENCE_SPACE_TYPE.FAVOURITE]: "Favourite",
} as const satisfies Record<ConfluenceSpaceType, string>;
