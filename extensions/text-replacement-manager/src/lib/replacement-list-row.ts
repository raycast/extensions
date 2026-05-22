import { replacementSearchKeywords } from "./search";
import {
  tagColorFor,
  type TagColorsByTag,
  type TagColorValue,
} from "./tag-colors";
import type { TextReplacement } from "./types";

export type ReplacementListRowStatus = "enabled" | "disabled";

export interface ReplacementListRowTag {
  name: string;
  color: TagColorValue;
}

export interface ReplacementListRow {
  status: ReplacementListRowStatus;
  trigger: string;
  replacementText: string;
  tags: ReplacementListRowTag[];
  keywords: string[];
}

export function replacementListRow(
  replacement: TextReplacement,
  tagColors: TagColorsByTag = {},
): ReplacementListRow {
  return {
    status: replacement.enabled ? "enabled" : "disabled",
    trigger: replacement.trigger,
    replacementText: replacement.replacementText,
    tags: replacement.tags.map((tag) => ({
      name: tag,
      color: tagColorFor(tag, tagColors),
    })),
    keywords: replacementSearchKeywords(replacement),
  };
}
