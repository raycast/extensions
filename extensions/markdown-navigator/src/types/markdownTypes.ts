// src/types/markdownTypes.ts
import { Color } from "@raycast/api";

export interface MarkdownFile {
  name: string;
  path: string;
  lastModified: number;
  tags: string[];
  size: number;
  folder: string;
}

export interface SystemTag {
  id: string;
  label: string;
  color: Color;
}

export const SYSTEM_TAGS: readonly SystemTag[] = [
  { id: "important", label: "Important", color: Color.Red },
  { id: "draft", label: "Draft", color: Color.Yellow },
  { id: "complete", label: "Complete", color: Color.Green },
  { id: "review", label: "Review", color: Color.Orange },
  { id: "archive", label: "Archive", color: Color.Blue },
];

export const MAX_VISIBLE_TAGS = 3;
