// PURE: projects, the grouping across apps. A project is a git repository: places and agents whose folder is in
// it belong to it, and a linked worktree (agents often make them) belongs to its main checkout, with the branch
// as the worktree's name. Nothing with no folder in a repository is guessed into one (ADR-022).

import type { GitRepo } from "../platform/model";

export interface Project {
  /** Folder name of the main checkout, e.g. "hopper". */
  name: string;
  /** Main checkout's folder: the project's identity. */
  root: string;
  /** Branch (or folder name) of the worktree, when not in the main checkout. */
  worktree?: string;
}

export function projectOf(repo: GitRepo | undefined): Project | undefined {
  if (!repo) return undefined;
  const name = baseName(repo.mainRoot);
  const worktree = repo.root !== repo.mainRoot ? (repo.branch ?? baseName(repo.root)) : undefined;
  return { name, root: repo.mainRoot, ...(worktree ? { worktree } : {}) };
}

/** "hopper", or "hopper · agents/levels" in a worktree. */
export function projectLabel(project: Project): string {
  return project.worktree ? `${project.name} · ${project.worktree}` : project.name;
}

const baseName = (path: string) => path.replace(/\/+$/, "").split("/").pop() || path;
