import { CONFLUENCE_CONTENT_TYPE, CONFLUENCE_ENTITY_TYPE, CONFLUENCE_SPACE_TYPE } from "@/constants";
import type { ValueOf } from "type-fest";

export type ConfluenceEntityType = ValueOf<typeof CONFLUENCE_ENTITY_TYPE>;

export type ConfluenceContentType = ValueOf<typeof CONFLUENCE_CONTENT_TYPE>;

export type ConfluenceSpaceType = ValueOf<typeof CONFLUENCE_SPACE_TYPE>;

export type ConfluenceIconType = ConfluenceEntityType | ConfluenceContentType;

export type ConfluenceLabelType = ConfluenceEntityType | ConfluenceContentType;

export type ConfluenceIcon = {
  path: string;
  width: number;
  height: number;
  isDefault: boolean;
};

export type ConfluenceSearchLinks = {
  self?: string;
  next?: string;
  base: string;
  context: string;
};
