// src/utils/groupOperations.ts
import { MarkdownFile } from "../types/markdownTypes";

export function groupFilesByFolder(files: MarkdownFile[]): Record<string, MarkdownFile[]> {
  return files.reduce<Record<string, MarkdownFile[]>>((groups, file) => {
    const key = file.folder;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(file);
    return groups;
  }, {});
}
