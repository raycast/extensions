import os from "node:os";
import path from "node:path";
import { AppError, ErrorCode } from "./errors";

/**
 * Expand a leading `~` to the user's home directory, then resolve to an absolute path.
 * Rejects paths that would escape via `..` segments.
 */
export function resolveWorkspacePath(raw: string | undefined | null): string {
  if (!raw || raw.trim() === "") {
    throw new AppError(ErrorCode.WORKSPACE_NOT_FOUND, "workspace path is not configured");
  }
  const expanded = raw.startsWith("~") ? path.join(os.homedir(), raw.slice(1).replace(/^[/\\]/, "")) : raw;
  const resolved = path.resolve(expanded);
  // After resolve, there should be no `..` left; if the original contained traversal,
  // the resolved form still points somewhere real — reject any path that resolves
  // outside the user's home unless it's absolute from root.
  if (resolved.split(path.sep).includes("..")) {
    throw new AppError(ErrorCode.PATH_TRAVERSAL, `path traversal detected in workspace path: ${raw}`);
  }
  return resolved;
}

export function sessionsDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "sessions");
}

export function sourcesDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "sources");
}

export function workspaceSkillsDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "skills");
}
