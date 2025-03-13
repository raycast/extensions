// src/types/markdownTypes.ts
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
  color: string;
}

export const SYSTEM_TAGS: readonly SystemTag[] = [
  { id: "important", label: "Important", color: "red" },
  { id: "draft", label: "Draft", color: "yellow" },
  { id: "complete", label: "Complete", color: "green" },
  { id: "review", label: "Review", color: "orange" },
  { id: "archive", label: "Archive", color: "blue" },
];

export const MAX_VISIBLE_TAGS = 3;
