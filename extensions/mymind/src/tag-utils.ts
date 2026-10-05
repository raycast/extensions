import { Tag } from "./types";

export const TAG_FLAG_AI = 2;
export const TAG_FLAG_MANUAL = 8;

export function isUserTag(tag: Tag): boolean {
  return ((tag.flags ?? 0) & TAG_FLAG_MANUAL) !== 0;
}

export function isAiTag(tag: Tag): boolean {
  return ((tag.flags ?? 0) & TAG_FLAG_AI) !== 0;
}
