import path from "node:path";
import { type Project } from "./project-store";

export function projectTitle(item: Project) {
  return (item.name ?? path.basename(item.worktree)) || item.worktree;
}

export function projectKeywords(item: Project) {
  const values = new Set<string>();
  values.add(item.worktree);
  values.add(path.basename(item.worktree));
  if (item.name) values.add(item.name);
  return [...values].filter(Boolean);
}
